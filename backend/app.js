'use strict'

const config = require('./config.js'),
  db = require('./lib/rethinkDB.js'),
  app = require('./lib/express.js'),
  server = require('./lib/server.js'),
  io = require('./lib/socket.js'),
  passport = require('./lib/auth.js'),
  async = require('async'),
  AsyncCache = require('async-cache'),
	Promise = require('bluebird'),
  caseAPI = require('./lib/caseAPI.js'),
    OPSkinAPI = require('./lib/modules/OPSkinAPI'),
	BattleModule = require('./lib/modules/BattleModule'),
	TaskerModule = require('./lib/modules/Tasker'),
  tradeAPI = require('./lib/tradeAPI.js'),
  Errors = require('./lib/Errors.js'),
  RequestStates = require('./lib/RequestStates.js'),
	_ = require('lodash'),
	moment = require('moment'),
	request = require('request-promise')


server.listen(config.port, _ => {
  console.log(`Listening on port ${server.address().port}`)

  if (process.send) process.send('ready')
})

const StateConvert = {
  2: RequestStates.Sent,
  3: RequestStates.Success,
  5: RequestStates.Expired,
  6: RequestStates.Cancelled,
  7: RequestStates.Declined,
  8: RequestStates.Invalid,
  9: RequestStates.Pending,
  10: RequestStates.Errored,
  12: RequestStates.Errored,
}

const BattleStates = {
  Active: 1, // Created and waiting for players
  Expired: 2, // Not enough players joined in time
  Errored: 3, // Something errored
  Closed: 4, // I would say owner closed it before expiration but im not sure it's gonna be a thing yet
  Pending: 5, // Enough players joined and it's opening the cases if opskins works
  Success: 6, // Cases have been opened and roll
  Finished: 7, // The rounds have been played
}

const spamScores = {}

let casesOpenStats = [];

setInterval(_ => {
  for (let key of Object.keys(spamScores)) {
    if (spamScores[key] > 0) addScore(key, -1)
    else delete spamScores[key]
  }
}, 1e3)

setInterval(_ => {
  const pl = {}

  for (let socket of Object.values(io.sockets.connected)) {
    if (socket && socket.user && !pl[socket.user.steamID]) {
      pl[socket.user.steamID] = {
        steamID: socket.user.steamID,
        username: socket.user.username,
        avatarUrl: socket.user.avatarUrl,
        rank: socket.user.rank,
      }
    }
  }

  io.connectedUsers = pl

  io.emit('chat.connectedUsers', pl)
}, 10e3)



const caseCache = new AsyncCache({
	load(key, cb) {
		if (key === 'caseSchema') {
			console.log('start caching cases');
			db.r.table('boxes').orderBy({index: db.r.desc('key_amount_per_case')}).run((err, cases) => {
				cb(null, cases, 3600e3)
			})
		} else if (key === 'minOpen') {
			caseAPI.getMinimumOpenVolume((err, count) => {
				if (err) cb(err)
				else cb(null, count, 3600e3)
			})
		}
	},
});

let siteConfig;
let BattleAPI;
let Tasker = new TaskerModule(caseAPI);

db.getConfig((err, config) => {
	if(err) console.log('error loading site config');
	siteConfig = config;
	BattleAPI = new BattleModule(caseCache, tradeAPI, caseAPI, io, siteConfig, addToOpenCache);
});

// cache clear endpoint
app.get('/clearCaseCache', (req, res) => {
  if (!req.query.password) return res.status(400).send({ success: false, err: 'Invalid parameters' })
  if (req.query.password !== config.session.secret)
    return res.status(400).send({ success: false, err: 'Wrong password' })

  try {
  	Tasker.buildCases().then(() => {
	    caseCache.reset();
    });
    res.status(200).send('Cases will be fetched from API on next load.')
  } catch (error) {
    res.send(500).send(error)
  }
})

app.get('/op-transfers', async (req, res) => {
	if(!req.user) return res.send('Please Login');
	if(req.user.rank !== 1) return res.send('Permission Denied');

	const data = await db.r.table('transactions').eqJoin('sentTo', db.r.table('users'), {index: 'opUID'}).zip();
	const totalSent = await db.r.table('transactions').sum('amount');

	let complete = {};

	async.each(data, async (tx, done) => {
		complete[tx.username] = {
			username: tx.username,
			amount: complete[tx.username] ? complete[tx.username].amount + tx.amount : tx.amount
		};
		done();
	}, () => {
		complete = _.sortBy(complete, 'amount').reverse();
		res.send({totalSent, transfers: complete});
	});
});

app.get('/resend-winnings/:battleID', async (req, res) => {
	const { battleID } = req.params;

	if(!req.user) return res.send('Please Login');
	if(req.user.rank !== 1 && req.user.rank !== 2) return res.send('Permission Denied');

	const battle = await db.r.table('battles').get(battleID);
	if(!battle) return res.send('Invalid battle');

	if(battle.winnerOfferID) {
		const offer = await tradeAPI.getOffer(battle.winnerOfferID);
		if([2,3].indexOf(offer.state) !== -1) return res.send(`Offer is ${offer.state === 2 ? 'Active' : 'Accepted'}`);

	}

	let itemsValue;

	for (let [steamID, cases] of Object.entries(battle.openedCases)) {
		for (let c4se of cases) {
			itemsValue = itemsValue + c4se.item.suggested_price_floor || c4se.item.suggested_price_floor
		}
	}

	const items = Object.values(battle.openedCases)
		.reduce((acc, val) => acc.concat(val), [])
		.map(c4se => c4se.item);


	const winner = await db.r.table('users').get(battle.winnerID);
	let itemsSorted = _.sortBy(items, 'suggested_price_floor').reverse();
	const maxTax = parseInt(parseInt(itemsValue) * BattleAPI.battleTax);
	console.log('Max Tax: ' +maxTax);
	let taxed = 0;

	let userWinnings = [];
	//Get items for taxing.
	for (let i = 0; i < itemsSorted.length; i++) {
		const item = itemsSorted[i];
		if ((item.suggested_price_floor + taxed) <= maxTax) {
			taxed += item.suggested_price_floor;
		} else {
			if(userWinnings.indexOf(item.id) === -1) {
				userWinnings.push(item.id);
			}
		}
	}

	tradeAPI.sendOffer(winner.opData.long_url, userWinnings, [], async (err, offerID) => {

		if (err) {
			return res.send(`Trade Offer ERR: ${err}`);
		}

		if (offerID) {
			db.r
				.table('trades')
				.insert({
					battleID: battle.id,
					offerID,
					userID: battle.winnerID,
					state: RequestStates.Sent,
					itemsToGive: items,
					itemsToReceive: [],
					keyChange: 0,
					date: db.r.now(),
				})
				.run(err => {
					if (err) console.error(`Unable to insert trade record in winner offer of battle ${battle.id}: ${err}`)
				})

			await db.r.table('battles').get(battleID).update({winnerOfferID: offerID});
			res.send(`Offer sent with ID of ${offerID} and url: https://trade.opskins.com/trade-offers/${offerID}`);
		}
	});

});

app.get('/check-trades/:userID', async (req, res) => {

	const StateConvert = {
		2: RequestStates.Sent,
		3: RequestStates.Success,
		5: RequestStates.Expired,
		6: RequestStates.Cancelled,
		7: RequestStates.Declined,
		8: RequestStates.Invalid,
		9: RequestStates.Pending,
		10: RequestStates.Errored,
		12: RequestStates.Errored,
	};

	const {userID} = req.params;
	const user = req.user;
	if(!user) return res.send('Please login!');
	if(user.rank !== 1 && user.rank !== 2) return res.send('Permission Denied');
	const searchUser = await db.r.table('users').get(userID);
	if(!searchUser) return res.send('USER NOT FOUND WITH ID: '+userID);
	const trades = await db.r.table('trades').getAll(userID, {index: 'userID'}).filter({state: 1});
	if(!trades) return res.send('No open trades found with that userID: '+userID);
	let keysAdded = 0;
	let tradesFoundOpen = trades.length;

	let sent = false;

	for(let trade of trades) {
		try {
			const offer = await tradeAPI.getOffer(trade.offerID);
			const results = await db.r.table('trades').get(offer.id).update({state: StateConvert[offer.state]}, {returnChanges: true});
			if (!results.changes[0]) {
				res.send(`Wasn't able to update trade, contact Argyl with this offerID: ${offer.id}`);
				sent = true;
				break;
			}

			if (results.changes[0].new_val.keyChange && StateConvert[offer.state] === RequestStates.Success) {
				await db.r.table('users').get(results.changes[0].new_val.userID).update({keyCount: db.r.row('keyCount').add(results.changes[0].new_val.keyChange)})
				keysAdded += results.changes[0].new_val.keyChange;
				console.log(keysAdded);
			}

		} catch (e) {
			res.send(e);
		}
	}
	if(!sent) {
		res.json({
			keysAdded,
			tradesFoundOpen,
			username: searchUser.username,
			completed: true
		});
	}
});

app.get('/battles-recent', async (req, res) => {
	try {
		const date = new Date();
		date.setDate(date.getDate() - 3);
		const trades = await db.r.table('trades').between(date, new Date(), {index: 'date'}).filter(db.r.row('keyChange').gt(0)).sum('keyChange').run();
		const battleFinished = await db.r.table('battles').between(date, new Date(), {index: 'date'}).filter({state: BattleStates.Finished}).sum('totalKeyCost').run();
		const battleFailed = await db.r.table('battles').between(date, new Date(), {index: 'date'}).filter({state: BattleStates.Errored}).sum('totalKeyCost').run();
		res.send(`Total keys deposited: ${trades} ----- Total Keys Battles Finished: ${battleFinished} ----- Total Keys Battles Errored ${battleFailed}`)
	} catch (e) {
		console.log(e);
		res.send(e);
	}
});

app.get('/cases', async (req, res) => {
	res.send(await db.r.table('boxes').run());
});

let openCache = []

db.r
  .table('cases')
  .orderBy({ index: db.r.desc('openDate') })
  .filter({ state: RequestStates.Opened })
  .limit(20)
  .merge({
    case: db.r.row,
    user: db.r
      .table('users')
      .get(db.r.row('userID'))
      .pluck('steamID', 'username', 'avatarUrl', 'rank'),
  })
  .pluck('case', 'user')
  .run((err, cases) => {
    if (err) console.error(`Unable to get recent cases on startup: ${err}`)
    else openCache = cases
  })

app.get('/ref/:code', (req, res) => {
  if (!req.cookies.ref && validateRefCode(req.params.code)) {
    res.cookie('refCode', req.params.code.toLowerCase(), { expires: new Date(2147483647000) })
  }

  res.redirect('/')
})

io.on('connection', socket => {
	socket.use((packet, next) => {
		if (typeof packet[packet.length - 1] !== 'function') return next(Errors.MissingParam)

		const cb = packet[packet.length - 1]

		if (addScore(socket.handshake.headers['cf-connecting-ip'], 1) > config.maxSpam) {
			console.error(`Some cunt (${socket.handshake.headers['cf-connecting-ip']}) is spamming ${packet[0]}`)
			return cb(Errors.RateLimited)
		}

		async.parallel(
			[
				done => {
					if (packet[0] === 'config.get') return done()
					if (!socket.handshake.sessionID) return done()

					db.r
						.table('users')
						.get(db.r.table('session').get(socket.handshake.sessionID)('session')('passport')('user'))
						.default(null)
						.run((err, user) => {
							done(err ? Errors.DatabaseError : null, user)
						})
				},
				done => {
					if (packet[0] === 'user.get') return done()

					db.r
						.table('data')
						.get('config')('data')
						.default(null)
						.run((err, config) => {
							if (err) return done(Errors.DatabaseError)
							if (!config || !config.whitelist || !config.maintenance || !Array.isArray(config.whitelist.list))
								return done(Errors.InternalError)

							done(null, config)
						})
				},
			],
			(err, results) => {
				if (err) return cb(err)

				if (packet[0] === 'user.get') return cb(null, results[0])
				if (packet[0] === 'config.get') return cb(null, results[1])

				socket.user = results[0]
				socket.config = results[1]

				if (socket.user && socket.user.banned === true) return cb(Errors.Banned)
				if (
					socket.config.whitelist.enabled &&
					(!socket.user || !socket.config.whitelist.list.map(user => user.steamID).includes(socket.user.steamID))
				)
					return cb(Errors.NotInWhitelist)
				if (socket.config.maintenance.active && (!socket.user || socket.user.rank !== 1)) return cb(Errors.Maintenance)

				next()
			}
		)
	})

	io.emit('stats.onlineUsers', io.engine.clientsCount)

	socket.on('disconnect', _ => {
		io.emit('stats.onlineUsers', io.engine.clientsCount)
	})

	socket.on('stats.getOnlineUsers', cb => {
		socket.emit('stats.onlineUsers', io.engine.clientsCount)
		cb()
	})

	socket.on('stats.getConnectedUsers', cb => {
		socket.emit('chat.connectedUsers', io.connectedUsers)
		cb()
	})

	socket.on('chat.get', cb => {
		if (typeof cb !== 'function') return

		db.getRecentChat((err, messages) => {
			if (err) cb(Errors.DatabaseError)
			else cb(null, messages)
		})
	})

	socket.on('chat.send', (msg, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		//if (socket.user.rank !== 1 && socket.user.rank !== 2 && socket.user.rank !== 3 && !socket.user.canChat) return cb(Errors.CannotUseChat);
		if (socket.user.rank !== 1 && socket.user.rank !== 2) {
			if (socket.chatSpam) return cb(Errors.RateLimited)
			if (socket.config.blocks.chat) return cb(Errors.AdminBlocked)
			if (socket.user.muteExp && socket.user.muteExp > Math.round(new Date() / 1000))
				return cb(Errors.UserMuted, socket.user.muteExp - Math.round(new Date() / 1000))
		}
		if (typeof msg !== 'string' || msg.length > 255 || !msg.replace(/\s/g, '').length) return cb(Errors.InvalidParam)

		let isAnnouncement = false

		if (msg[0] === '/') {
			if (socket.user.rank !== 1 && socket.user.rank !== 2) return cb(Errors.InsufficientPrivilege)

			if (msg.startsWith('/announce ')) {
				msg = msg.replace('/announce ', '')
				isAnnouncement = true
			} else if (msg.startsWith('/mute ')) {
				msg = msg.replace('/mute ', '').split(' ')

				let duration

				if (!msg[0]) return cb(Errors.InvalidParam)

				if (msg[1]) {
					duration = parseInt(msg[1])

					if (duration.toString() !== msg[1]) return cb(Errors.InvalidParam)
					if(duration === 0) duration = 63113904;
				} else {
					duration = 300
				}

				return db.r
					.table('users')
					.get(msg[0])
					.update({muteExp: Math.round(new Date() / 1000 + duration)})
					.run((err, results) => {
						if (err) cb(Errors.DatabaseError)
						else if (results.skipped) cb(Errors.NotChanged)
						else cb()
					})
			} else if (msg.startsWith('/unmute ')) {
				msg = msg.replace('/unmute ', '').split(' ')

				if (!msg[0]) return cb(Errors.InvalidParam)

				return db.r
					.table('users')
					.get(msg[0])
					.update({muteExp: 0})
					.run((err, results) => {
						if (err) cb(Errors.DatabaseError)
						else if (results.skipped) cb(Errors.NotChanged)
						else cb()
					})
			} else if (msg === '/clear') {
				return db.r
					.table('chat')
					.orderBy({index: db.r.desc('date')})
					.update({hidden: true})
					.run(err => {
						if (err) cb(Errors.DatabaseError)
						else {
							cb()
							io.emit('chat.clear')
						}
					})
			} else if (msg.startsWith('/purge ')) {
				msg = msg.replace('/purge ', '').split(' ')

				if (!msg[0]) return cb(Errors.InvalidParam)

				return db.r
					.table('chat')
					.filter({steamID: msg[0]})
					.update({hidden: true})
					.run(err => {
						if (err) cb(Errors.DatabaseError)
						else {
							cb()
							io.emit('chat.purge', msg[0])
						}
					})
			} else {
				return cb(Errors.InvalidCommand)
			}
		}

		socket.chatSpam = true

		setTimeout(_ => {
			socket.chatSpam = false
		}, socket.config.chatDelay)

		db.r
			.table('chat')
			.insert(
				{
					steamID: socket.user.steamID,
					message: msg,
					announcement: isAnnouncement,
					hidden: false,
					date: db.r.now(),
				},
				{returnChanges: true}
			)
			.run((err, results) => {
				if (err) return cb(Errors.DatabaseError)

				cb()

				io.emit('chat.message', {
					id: results.changes[0].new_val.id,
					message: results.changes[0].new_val.message,
					announcement: results.changes[0].new_val.announcement,
					date: results.changes[0].new_val.date,
					user: {
						steamID: socket.user.steamID,
						username: socket.user.username,
						avatarUrl: socket.user.avatarUrl,
						rank: socket.user.rank,
					},
				})
			})
	})

	socket.on('config.modify', (config, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)
		if (config === null || typeof config !== 'object' || Array.isArray(config)) return cb(Errors.InvalidParam)

		db.r
			.table('data')
			.get('config')
			.update({data: config}, {returnChanges: true})
			.run((err, result) => {
				if (err) return cb(Errors.DatabaseError)
				if (!result.changes[0]) return cb(Errors.NotChanged)

				cb(null, result.changes[0].new_val)
				console.log(result.changes[0].new_val.data.blocks.battle);
				BattleAPI.toggle(result.changes[0].new_val.data.blocks.battle);
				io.emit('config.changed', result.changes[0].new_val)
			})
	})

	socket.on('admin.getUser', (steamID, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user || socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)
		if (typeof steamID !== 'string') return cb(Errors.InvalidParam)

		db.getUser(steamID, (err, user) => {
			if (err) cb(Errors.DatabaseError)
			else cb(null, user)
		})
	})

	socket.on('admin.setBan', (steamID, val, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user || socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)
		if (typeof steamID !== 'string' || typeof val !== 'boolean') return cb(Errors.InvalidParam)

		db.r
			.table('users')
			.get(steamID)
			.update({banned: val})
			.run((err, results) => {
				if (err) cb(Errors.DatabaseError)
				else cb()
			})
	})

	socket.on('admin.sendBalance', (opUID, amount, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user || socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)
		if (typeof opUID !== 'string' || typeof amount !== 'number') return cb(Errors.InvalidParam)

		if(!socket.config.blocks.payout) {
			tradeAPI.transferFunds(socket.user, opUID, amount, cb)
		} else {
			cb(Errors.AdminBlocked);
		}
	});

	socket.on('admin.getOpBalance', cb => {
		if (typeof cb !== 'function') return
		if (!socket.user || socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)

		tradeAPI.getOpBalance(cb)
	})

	socket.on('admin.getCashoutHistory', cb => {
		if (typeof cb !== 'function') return
		if (!socket.user || socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)

		tradeAPI.getOPCashouts(cb)
	})

	socket.on('admin.getOPTransferHistory', cb => {
		if (typeof cb !== 'function') return
		if (!socket.user || socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)

		tradeAPI.getOPTransferHistory(cb)
	})

	socket.on('admin.getRevenue', (start, end, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user || socket.user.rank !== 1) return cb(Errors.InsufficientPrivilege)
		if (typeof start !== 'number' || typeof end !== 'number') return cb(Errors.InvalidParam)

		db.r
			.table('stats')
			.between(new Date(start), new Date(end))
			.run((err, results) => {
				if (err) cb(Errors.DatabaseError)
				else cb(null, results)
			})
	})

	socket.on('ref.getRef', (code, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (typeof code !== 'string') return cb(Errors.InvalidParam)

		db.r
			.table('refs')
			.get(code)
			.run((err, ref) => {
				if (err) return cb(Errors.DatabaseError)
				if (!ref) return cb(Errors.RefNotFound)
				if (socket.user.rank !== 1 && socket.user.steamID !== ref.userID) return cb(Errors.InsufficientPrivilege)

				cb(null, ref)
			})
	})

	socket.on('ref.createCode', (code, opID, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (typeof code !== 'string' || typeof opID !== 'number') return cb(Errors.InvalidParam)
		if (socket.user.ownRef) return cb(Errors.RefAlreadyCreated)
		if (!validateRefCode(code)) return cb(Errors.RefInvalid)

		db.r
			.table('refs')
			.insert({
				id: code.toLowerCase(),
				opID,
				userID: socket.user.steamID,
				usageCount: 0,
				caseCount: 0,
				revenue: 0,
			})
			.run((err, results) => {
				if (err) return cb(Errors.DatabaseError)
				if (!results.inserted) return cb(Errors.RefAlreadyExist)

				db.r
					.table('users')
					.get(socket.user.steamID)
					.update({ownRef: code})
					.run(err => {
						if (err) cb(Errors.DatabaseError)
						else cb()
					})
			})
	})

	socket.on('ref.setRef', (code, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (socket.user.refCode) return cb(Errors.RefAlreadySet)
		if (code === socket.user.ownRef) return cb(Errors.RefCannotUseSelf)

		async.series(
			[
				next => {
					db.r
						.table('refs')
						.get(code)
						.run((err, ref) => {
							if (err) return next(Errors.DatabaseError)
							if (!ref) return next(Errors.RefNotFound)

							next()
						})
				},
				next => {
					db.r
						.table('users')
						.get(socket.user.steamID)
						.update({refCode: code})
						.run(err => {
							if (err) next(Errors.DatabaseError)
							else next()
						})
				},
			],
			err => {
				if (err) return cb(err)

				cb()

				db.r
					.table('refs')
					.get(code)
					.update({usageCount: db.r.row('usageCount').add(1)})
					.run(err => {
						if (err) console.error(`Unable to update usageCount value of ref ${code}: ${err}`)
					})
			}
		)
	})

	socket.on('stats.getRecentUnboxes', cb => {
		if (typeof cb !== 'function') return

		cb(null, openCache)
	})

	socket.on('stats.getStats', cb => {
		if (typeof cb !== 'function') return

		const pl = {
			amountDay: 0,
			valueDay: 0,
			amountAll: 0,
			valueAll: 0,
			topDay: null,
		}

		async.parallel(
			[
				done => {
					db.r
						.table('stats')
						.get(getAutismTime())
						.run((err, stats) => {
							if (err) return done(Errors.DatabaseError)
							if (!stats) return done()

							pl.amountDay = stats.amount
							pl.valueDay = stats.value
							pl.topDay = stats.topDay

							done()
						})
				},
				done => {
					db.r
						.table('stats')
						.pluck('amount', 'value')
						.reduce((a, b) => {
							return {
								amount: a('amount').add(b('amount')),
								value: a('value').add(b('value')),
							}
						})
						.default({
							amount: 0,
							value: 0,
						})
						.run((err, result) => {
							if (err) return done(Errors.DatabaseError)

							pl.amountAll = result.amount
							pl.valueAll = result.value

							done()
						})
				},
			],
			err => {
				if (err) cb(err)
				else cb(null, pl)
			}
		)
	})

	socket.on('stats.getCase', (caseID, cb) => {
		if (typeof cb !== 'function') return
		if (typeof caseID !== 'number') return cb(Errors.InvalidParam)

		db.r
			.table('cases')
			.getAll(caseID, {index: 'caseID'})
			.run((err, c4se) => {
				if (err) return cb(Errors.DatabaseError)
				if (!c4se || !c4se[0]) return cb(Errors.CaseNotFound)

				c4se = c4se[0]

				db.r
					.table('users')
					.get(c4se.userID)
					.pluck('steamID', 'username', 'avatarUrl', 'rank')
					.run((err, user) => {
						if (err) return cb(Errors.DatabaseError)

						cb(null, {user, case: c4se})
					})
			})
	})

	socket.on('vgo.getCases', cb => {
		if (typeof cb !== 'function') return;

		caseCache.get('caseSchema', cb);
	});

	socket.on('vgo.getKeyCount', async cb => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)

		try {
			const key = await caseAPI.getKeyCount(socket.user.opData.long_url);
			cb(null, key);
		} catch (e) {
			cb(e);
		}
	})

	socket.on('vgo.getMinOpen', cb => {
		if (typeof cb !== 'function') return

		caseCache.get('minOpen', cb)
	})

	socket.on('vgo.requestCase', (schemaID, amount, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (typeof schemaID !== 'number' || typeof amount !== 'number') return cb(Errors.InvalidParam)

		let opID;
		let caseSchema;

		async.waterfall(
			[
				next => {
					async.parallel(
						[
							done => {
								db.r.table('boxes').get(schemaID).run((err, box) => {
									if(err) return done(Errors.APIError);
									caseSchema = box;
									done();
								});
							},
							done => {
								if (!socket.user.refCode) return done()

								db.r
									.table('refs')
									.get(socket.user.refCode)
									.run((err, ref) => {
										if (err) return done(Errors.DatabaseError)
										if (!ref) return done()

										opID = ref.opID

										done()
									})
							},
						],
						next
					)
				},
				(a, next) => {
					caseAPI.sendKeyRequest(socket.user, schemaID, amount, opID, false, caseSchema)
						.then(id => {
							next(null, id)
						})
						.catch(_ => next(Errors.APIError));
				},
				(data, next) => {
					const {offerID, accepted} = data;
					let cut = (caseSchema.key_amount_per_case * 250) * 0.20;
					if (opID) cut -= 8;

					db.r
						.table('cases')
						.insert(
							new Array(amount).fill({
								offerID,
								schemaID,
								userID: socket.user.steamID,
								caseID: null,
								refID: opID ? socket.user.refCode : null,
								state: RequestStates.Sent,
								item: null,
								date: new Date(),
								openDate: null,
								cut,
								affCut: opID ? 8 : 0,
								battleID: null,
							})
						)
						.run(err => {
							if (err) next(Errors.DatabaseError)
							else next(null, data)
						})
				},
			],
			cb
		)
	})

	socket.on('user.getActiveCases', cb => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)

		db.r
			.table('cases')
			.getAll(socket.user.steamID, {index: 'userID'})
			.filter(
				db.r
					.row('state')
					.eq(RequestStates.Sent)
					.or(db.r.row('state').eq(RequestStates.Pending))
					.or(db.r.row('state').eq(RequestStates.Success))
					.or(db.r.row('state').eq(RequestStates.Limbo))
					.and(db.r.row('battleID').not())
			)
			.orderBy(db.r.desc('date'))
			.run((err, cases) => {
				if (err) return cb(Errors.DatabaseError)

				const requests = {},
					oldCases = {}

				for (let c4se of cases) {
					if (c4se.state !== RequestStates.Success)
						requests[c4se.offerID] = requests[c4se.offerID] ? requests[c4se.offerID].concat(c4se.id) : [c4se.id]
					oldCases[c4se.id] = c4se
				}

				async.parallel(
					Object.entries(requests).map(([offerID, casesIDs]) => {
						return done => {
							caseAPI.getTradeStatus(offerID, (err, result) => {
								if (err) return done(err)

								if (result.cases.length) {
									async.parallel(
										result.cases.map((newCase, i) => {
											return async () => {
												if(newCase.item) {
													try {
														const values = await new OPSkinAPI().getInstantSellValue(newCase.item.market_name, parseInt(newCase.item.internal_app_id));
														newCase.item.instant_sell_prices = values;
														newCase.item.instant_sell_expires = moment().add(60, 'm').utc().format();
													} catch (e) {
														console.log('INSTANT ERR', e)
													}
												}
												db.r
													.table('cases')
													.get(casesIDs[i])
													.update(
														{
															caseID: newCase.id,
															state:
																newCase.status === 2
																	? RequestStates.Pending
																	: newCase.status === 3
																	? RequestStates.Success
																	: RequestStates.Errored,
															item: newCase.item,
														},
														{returnChanges: true}
													)
													.run((err, results) => {
														if (err) return done(Errors.DatabaseError)
														if (!results.changes[0]) return done()

														if (
															results.changes[0].new_val.state === RequestStates.Success &&
															oldCases[casesIDs[i]].state < RequestStates.Success
														) {

															if (results.changes[0].new_val.refID) {
																db.r
																	.table('refs')
																	.get(results.changes[0].new_val.refID)
																	.update({
																		caseCount: db.r.row('caseCount').add(1),
																		revenue: db.r.row('revenue').add(results.changes[0].new_val.affCut),
																	})
																	.run(err => {
																		if (err)
																			console.error(
																				`Unable to update referal stats in update case of ${casesIDs[i]}: ${err}`
																			)
																	})
															}

															const date = getAutismTime()

															db.r
																.table('stats')
																.get(date)
																.replace(row => {
																	return row.branch(
																		{
																			date,
																			revenue: row('revenue').add(results.changes[0].new_val.cut),
																			amount: row('amount'),
																			value: row('value'),
																			topDay: row('topDay'),
																		},
																		{
																			date,
																			revenue: results.changes[0].new_val.cut,
																			amount: 0,
																			value: 0,
																			topDay: [],
																		}
																	)
																})
																.run(err => {
																	if (err)
																		console.error(
																			`Unable to update general stats in update case of ${casesIDs[i]}: ${err}`
																		)
																})
														}

														oldCases[results.changes[0].new_val.id] = results.changes[0].new_val;
													})
											}
										}),
										done
									)
								} else {
									const newState = StateConvert[result.offer.state]

									db.r
										.table('cases')
										.getAll(db.r.args(casesIDs))
										.update(
											{
												state:
													newState === RequestStates.Invalid
														? db.r
														.row('date')
														.ge(db.r.now().sub(600))
														.branch(RequestStates.Limbo, RequestStates.Invalid)
														: newState,
											},
											{returnChanges: true}
										)
										.run((err, results) => {
											if (err) done(Errors.DatabaseError)
											else {
												for (let result of results.changes) oldCases[result.new_val.id] = result.new_val

												done()
											}
										})
								}
							})
						}
					}),
					err => {
						if (err) cb(err)
						else cb(null, Object.values(oldCases))
					}
				)
			})
	})

	socket.on('user.getOldCases', cb => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)

		db.r
			.table('cases')
			.getAll(socket.user.steamID, {index: 'userID'})
			.filter(
				db.r
					.row('state')
					.ne(RequestStates.Sent)
					.and(db.r.row('state').ne(RequestStates.Pending))
					.and(db.r.row('state').ne(RequestStates.Success))
					.and(db.r.row('state').ne(RequestStates.Limbo))
					.and(db.r.row('battleID').not())
			)
			.run((err, cases) => {
				if (err) cb(Errors.DatabaseError)
				else cb(null, cases)
			})
	})

	socket.on('user.openCase', (id, quickOpen, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (typeof id !== 'string' || typeof quickOpen !== 'boolean') return cb(Errors.InvalidParam)

		db.r
			.table('cases')
			.get(id)
			.update(
				row => {
					return row('state')
						.eq(RequestStates.Success)
						.and(row('battleID').not())
						.branch(
							{
								state: RequestStates.Opened,
								openDate: db.r.now(),
							},
							{}
						)
				},
				{returnChanges: true}
			)
			.run((err, results) => {
				if (err) return cb(Errors.DatabaseError)
				if (results.skipped) return cb(Errors.InvalidParam)
				if (results.unchanged) return cb(Errors.NotChanged)
				if (!results.replaced) return cb(Errors.InternalError)

				cb()

				setTimeout(
					_ => {
						const pl = {
							user: {
								steamID: socket.user.steamID,
								username: socket.user.username,
								avatarUrl: socket.user.avatarUrl,
								rank: socket.user.rank,
							},
							case: results.changes[0].new_val,
						}

						io.emit('stats.newUnbox', pl)

						addToOpenCache(pl)

						const schemaID = results.changes[0].new_val.schemaID.toString()

						db.r
							.table('users')
							.get(socket.user.steamID)
							.update({
								stats: {
									[schemaID]: {
										openCount: db.r
											.row('stats')(schemaID)('openCount')
											.default(0)
											.add(1),
										openSum: db.r
											.row('stats')(schemaID)('openSum')
											.default(0)
											.add(results.changes[0].new_val.item.suggested_price_floor),
									},
								},
								canChat: true,
							})
							.run(err => {
								if (err) console.error(`Unable to update stats of user ${socket.user.steamID}: ${err}`)
							})

						const date = getAutismTime()

						db.r
							.table('stats')
							.get(date)
							.replace(row => {
								return row.branch(
									{
										date,
										amount: row('amount').add(1),
										value: row('value').add(results.changes[0].new_val.item.suggested_price_floor),
										topDay: row('topDay')
											.append(pl)
											.orderBy(db.r.desc(row => row('case')('item')('suggested_price_floor')))
											.limit(30),
										revenue: row('revenue'),
									},
									{
										date,
										amount: 1,
										value: results.changes[0].new_val.item.suggested_price_floor,
										topDay: [pl],
										revenue: 0,
									}
								)
							})
							.run(err => {
								if (err) console.error(`Unable to update general stats in open case of ${id}: ${err}`)
							})
					},
					quickOpen ? 0 : 30e3
				)
			})
	})

	socket.on('user.getBattleHistory', cb => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)

		db.r
			.table('battles')
			.filter(row =>
				row('userID')
					.eq(socket.user.steamID)
					.or(row('players').contains(player => player('steamID').eq(socket.user.steamID)))
			)
			.run((err, battles) => {
				if (err) cb(Errors.DatabaseError)
				else cb(null, battles)
			})
	})

	socket.on('user.depositKeys', (amount, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (socket.config.blocks.battle && socket.user.rank !== 1 && socket.user.rank !== 2) return cb(Errors.AdminBlocked)
		if (typeof amount !== 'number' || amount < 1 || amount > 400) return cb(Errors.InvalidParam)

		let items = []

		tradeAPI.getUserInventory(socket.user.opData.uid, (err, inventory) => {
			if (err) return cb(err)

			for (let item of inventory) {
				if (item.sku === 1) {
					items.push(item)

					if (items.length >= amount) break
				}
			}

			if (items.length < amount) return cb(Errors.NotEnoughKeys)

			tradeAPI.sendOffer(socket.user.opData.long_url, [], items.map(item => item.id), (err, offerID) => {
				if (err) return cb(err)

				db.r
					.table('trades')
					.insert({
						offerID,
						userID: socket.user.steamID,
						state: RequestStates.Sent,
						itemsToGive: [],
						itemsToReceive: items,
						keyChange: items.length,
						date: db.r.now(),
					})
					.run(err => {
						if (err) return cb(Errors.DatabaseError)

						cb(null, offerID)

						db.r
							.table('trades')
							.get(offerID)
							.changes()
							.run((err, feed) => {
								if (err) return console.error(`Unable to create changefeed in depositKeys of trade ${offerID}: ${err}`)

								feed.on('error', err => {
									console.error(`Error in trade status changefeed: ${err}`)
									feed.close()
								})

								feed.on('data', data => {
									if (!data.new_val || !data.new_val.state) return feed.close()
									if (
										data.new_val.state !== RequestStates.Sent &&
										data.new_val.state !== RequestStates.Limbo &&
										data.new_val.state !== RequestStates.Pending
									)
										feed.close()

									socket.emit('trade.update', data.new_val)
								})
							})
					})
			})
		})
	})

	socket.on('user.buyKeys', async (amount, cb) => {
		try {
			const user = await db.r.table('users').get(socket.user.steamID).pluck('accessToken').run();
			const resp = await new OPSkinAPI(user.accessToken).purchaseKeys(socket.user.steamID, amount);
			cb(null, resp); //Returns {balance: 904324930} or {balance: 4343278493, message: 105} -Keys bought but didn't transfer to express- or int(102) for error
		} catch (e) {
			cb(e);
		}
    });

	socket.on('user.getBalance', async cb => {
		try {
			const resp = await new OPSkinAPI().getUserBalance(socket.user.steamID);
			cb(null, resp);
		} catch (e) {
			cb(e);
		}
	});

	socket.on('user.sellRecentItems', async (itemIDs, cb) => {
		try {
			const resp = await new OPSkinAPI().sellRecentItems(socket.user.steamID, itemIDs);
			cb(null, resp);
		} catch (e) {
			cb(e);
		}
	});

	socket.on('battle.list', cb => {
		if (typeof cb !== 'function') return

		let filter = db.r.row('isPrivate').eq(false)

		if (socket.user) filter = filter.or(db.r.row('userID').eq(socket.user.steamID))

		db.r
			.table('battles')
			.getAll(BattleStates.Active, BattleStates.Pending, BattleStates.Success, {index: 'state'})
			.filter(filter)
			.run((err, battles) => {
				if (err) cb(Errors.DatabaseError)
				else cb(null, battles)
			})
	})

	socket.on('battle.create', async (cases, slots, isPrivate, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (socket.config.blocks.battle && socket.user.rank !== 1 && socket.user.rank !== 2) return cb(Errors.AdminBlocked)

		try {
			const battle = await BattleAPI.create(socket.user, cases, slots, isPrivate);
			cb(null, battle);
			if(!isPrivate) io.emit('battles.newBattle', battle);
		} catch (e) {
			cb(e);
		}
	});

	socket.on('battle.join', async (id, cb) => {
		if (typeof cb !== 'function') return
		if (!socket.user) return cb(Errors.NotLoggedIn)
		if (socket.config.blocks.battle && socket.user.rank !== 1 && socket.user.rank !== 2) return cb(Errors.AdminBlocked)
		if (typeof id !== 'string') return cb(Errors.InvalidParam)

		try {
			const resp = await BattleAPI.join(socket.user, id);
			const battle = resp.battle;
			const player = resp.player;

			if (!battle.isPrivate) io.emit('battles.newPlayer', battle.id, player);

			io.to(`battle_${battle.id}`).emit('battle.newPlayer', player);
			return cb(null, battle.id);
		} catch (e) {
			console.log(e);
			//BattleAPI.refundKeys(socket.user.steamID, battle.totalKeyCost);

			return cb(e)
		}
	});

	socket.on('battle.startNow', async (battleID, cb) => {
		if(!socket.user) return cb(Errors.NotLoggedIn);
		if(socket.config.blocks.battle && socket.user.rank !== 1 && socket.user.rank !==2) return cb(Errors.AdminBlocked);

		try {
			const battle = await BattleAPI.earlyStart(battleID, socket.user.steamID);
			cb(null, battle.id);
		} catch (e) {
			console.log(e);
			cb(e);
		}

	})

	/*socket.on('battle.cancel', (id, cb) => {
		  cb check
		  is logged in
		  arg check
		  battle exist
		  is battle owner
		  battle is in good state atomic change state
	  });

	  socket.on('battle.close', (id, cb) => {
		  cb check
		  is logged in
		  arg check
		  battle exist
		  is battle owner
		  battle is in good state atomic reduce slots count
	  });*/

	socket.on('battle.get', (id, cb) => {
		if (typeof cb !== 'function') return
		if (typeof id !== 'string') return cb(Errors.InvalidParam)

		db.r
			.table('battles')
			.get(id)
			.run((err, battle) => {
				if (err) cb(Errors.DatabaseError)
				else cb(null, battle)
			})
	})

	socket.on('battle.joinRoom', (id, cb) => {
		if (typeof cb !== 'function') return
		if (typeof id !== 'string') return cb(Errors.InvalidParam)

		db.r
			.table('battles')
			.get(id)
			.run((err, battle) => {
				if (err) return cb(Errors.DatabaseError)
				if (!battle) return cb(Errors.BattleNotFound)
				if (
					battle.state !== BattleStates.Active &&
					battle.state !== BattleStates.Pending &&
					battle.state !== BattleStates.Success
				)
					return cb(Errors.BattleClosed)

				socket.join(`battle_${battle.id}`)

				cb()
			})
	})

	socket.on('battle.leaveRoom', (id, cb) => {
		if (typeof cb !== 'function') return
		if (typeof id !== 'string') return cb(Errors.InvalidParam)

		socket.leave(`battle_${id}`)

		cb()
	})
})


setInterval(_ => {
	async.parallel(
		[
			cb => {
				caseAPI.getKeyCount(config.tradeAPI.tradeUrl)
					.then(key => {
						cb(null, key);
					})
					.catch(err => cb(err));
			},
			cb => {
				db.r
					.table('users')
					.sum('keyCount')
					.run(cb)
			},
			cb => {
				db.r
					.table('battles')
					.getAll(BattleStates.Active, {index: 'state'})
					.sum('totalKeyCost')
					.run(cb)
			},
		],
		(err, results) => {
			if (err) console.error(`Unable to verify key count: ${err}`)
			if (parseInt(results[0]) < results[1] + results[2])
				console.error(`[WARNING] Not enough keys in OP account: ${results[0]} (-${results[1] + results[2]})`)
		}
	)
}, 40e3)


function refundKeys(steamID, amount) {
  db.r
    .table('users')
    .get(steamID)
    .update({ keyCount: db.r.row('keyCount').add(amount) })
    .run(err => {
      if (err) console.error(`Unable to refund ${amount} keys to ${steamID}: ${err}`)
    })
}

/*function refundItem(steamID, items) {
    console.error(`Unable to refund items to ${steamID} because it's not implemented`);
}*/

function addScore(key, value) {
  return (spamScores[key] = Math.max((spamScores[key] || 0) + value, 0))
}

function addToOpenCache(element) {
  openCache.unshift(element)
  openCache = openCache.slice(0, 20)
}

function validateRefCode(code) {
  return typeof code === 'string' && code.length <= 16 && code.match(/^[a-zA-Z0-9]+$/)
}

function getAutismTime() {
  let date = new Date()

  if (date.getHours() < 9) date = new Date(date - 86400000)

  date.setHours(9, 0, 0, 0)

  return date
}



/*
    const currentRaffle = {};

    setTimeout(closeRaffle, new Date)

    socket.on('raffle.get', cb => {
        if (typeof cb !== 'function') return;

        currentRaffle
    });

    socket.on('raffle.enter', cb => {
        if (typeof cb !== 'function') return;
        if (!socket.user) return cb(Errors.NotLoggedIn);
        //if(!socket.user.canChat) return cb(Errrors.);
        //if(!socket.user.refCode) return cb(Errors.);

    });
*/
