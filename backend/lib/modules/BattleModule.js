const db = require('../rethinkDB');
const config = require('../../config');
const OPSkinAPI = require('./OPSkinAPI');
const Error = require('../Errors');
const RequestStates = require('../RequestStates');

const async = require('async');
const request = require('request-promise');
const Promise = require('bluebird');
const { EventEmitter } = require('events');
const _ = require('lodash');

class BattleModule extends EventEmitter {

	constructor(caseCache, tradeAPI, caseAPI, io, siteConfig, addToOpenCache) {
		super();
		this.tradeAPI = tradeAPI;
		this.caseAPI = caseAPI;
		this.addToOpenCache = addToOpenCache;
		this.caseCache = caseCache;
		this.blocked = siteConfig.blocks.battle;
		this.io = io;

		this.battleTax = 0.10;
		this.maxRounds = 40;
		this.maxPlayers = 5;
		this.maxGamesPerPlayer = 3;
		this.gameLength = 1800;

		this.activeChecks = {};
		this.battlesStarted = [];

		this.BattleStates = {
			Active: 1, // Created and waiting for players
			Expired: 2, // Not enough players joined in time
			Errored: 3, // Something messed up
			Closed: 4, // I would say owner closed it before expiration but im not sure it's gonna be a thing yet
			Pending: 5, // Enough players joined and it's opening the cases
			Success: 6, // Cases have been opened and roll
			Finished: 7, // The rounds have been played
		};

		this.StateConvert = {
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

		this.caseQueue = async.queue(({ schemaID, amount }, cb) => {
			this.caseCache.get('caseSchema', (err, schema) => {
				const caseSchema = _.find(schema, {id: schemaID});
				this.caseAPI.sendKeyRequest(config.tradeUrl, schemaID, amount, null, true, caseSchema)
					.then(offerID => {
						console.log(offerID);
						setTimeout(cb, 1e3, null, offerID);
					})
					.catch(err => {
						cb(err);
					});
			});
		});

		this.updateBattles = this.updateBattles.bind(this);
		this.startBattleOfferUpdater = this.startBattleOfferUpdater.bind(this);
		this.startBattle = this.startBattle.bind(this);

		this._scheduleBattleUpdate();
		this._battleCheck();

		db.r
			.table('battles')
			.getAll(this.BattleStates.Pending, this.BattleStates.Success, { index: 'state' })
			.run((err, battles) => {
				if (err) return console.error(`Unable to get pending battles on startup: ${err}`)

				for (let battle of battles) {
					if (battle.state === this.BattleStates.Pending) this.startBattleOfferUpdater(battle.id, battle.offerIDs);
					else if (battle.state === this.BattleStates.Success) setTimeout(this.startBattle, 2e3, battle);
				}
			});
	}

	toggle(boolean) {
		this.blocked = boolean;
	}



	_scheduleBattleUpdate() {

		setTimeout(() => {
			this.updateBattles(err => {
				if (err) console.error(`Unable to update battles: ${err}`)

				this._scheduleBattleUpdate()
			})
		}, 1e3);
	}

	_battleCheck() {
		setTimeout(() => {
			db.r
				.table('battles')
				.getAll(this.BattleStates.Pending, this.BattleStates.Success, { index: 'state' })
				.run((err, battles) => {
					if (err) return console.error(`Unable to get pending battles on startup: ${err}`);

					for (let battle of battles) {
						console.log(battle.id+' - '+battle.state);
						if (battle.state === this.BattleStates.Pending) this.startBattleOfferUpdater(battle.id, battle.offerIDs);
						else if (battle.state === this.BattleStates.Success) this.startBattle(battle);
					}
					this._battleCheck();
				});
		}, 5e3)
	}

	get(id) {
		return new Promise(async (resolve, reject) => {
			try {
				resolve(await db.r.table('battles').get(id).run());
			} catch (e) {
				reject(Error.DatabaseError);
			}
		})
	}

	insert(user, {cases, totalKeyCost, slots, isPrivate}) {
		return new Promise(async (resolve, reject) => {
			try {
				const battle = await
				db.r
					.table('battles')
					.insert(
						{
							userID: user.steamID,
							state: this.BattleStates.Active,
							currentRound: 0,
							cases,
							totalKeyCost,
							offerIDs: null,
							openedCases: {
								[user.steamID]: [],
							},
							winnerID: null,
							winnerOfferID: null,
							slots,
							players: [
								{
									steamID: user.steamID,
									username: user.username,
									avatarUrl: user.avatarUrl,
									rank: user.rank,
								},
							],
							isPrivate,
							date: db.r.now(),
							expire: db.r.now().add(1800),
						},
						{returnChanges: true}
					).run();
				resolve(battle.changes[0].new_val)
			} catch (e) {
				console.log('insert', e);
				reject(Error.DatabaseError);
			}
		});
	}

	earlyStart(battleID, userID) {
		return new Promise(async (resolve, reject) => {
			try {
				const battle = await db.r.table('battles').get(battleID);
				if(battle.slots === 2) return reject(Error.BattleRequireThreePlus);
				if(battle.players.length < 2) return reject(Error.BattleLeastTwoPlayers);
				if(battle.state !== this.BattleStates.Active) return reject(Error.BattleAlreadyStarted);
				if(battle.userID !== userID) return reject(Error.InsufficientPrivilege);

				const battleUpdated = await db.r.table('battles').get(battleID).update({slots: battle.players.length});
				resolve(battleUpdated);
			} catch (e) {
				console.log('EarlySTART', e);
				reject(e);
			}
		});
	}

	create(user, cases, slots, isPrivate) {
		return new Promise(async (resolve, reject) => {
			try {
				if(this.blocked) return reject(Error.Maintenance);
				if (!Array.isArray(cases) || cases.length < 1 || cases.length > this.maxRounds || typeof slots !== 'number' ||	slots < 2 || slots > this.maxPlayers ||	typeof isPrivate !== 'boolean')	return reject(Errors.InvalidParam);

				let totalKeyCost = 0;

				const gameCount = await db.r
					.table('battles')
					.getAll(this.BattleStates.Active, this.BattleStates.Pending, this.BattleStates.Success, {index: 'state'})
					.filter({userID: user.steamID})
					.count()
					.run();

				if (gameCount >= this.maxGamesPerPlayer && user.rank < 1) return reject(Error.BattleAlreadyCreated);

				this.caseCache.get('caseSchema', (err, schema) => {
					if (err) return reject(Error.APIError);

					const caseData = {};

					const schemaIDs = schema.map(c4se => {
						if (c4se.remaining_opens > 50) {
							caseData[c4se.id] = c4se;
							return c4se.id
						}
					});

					if (cases.some(schemaID => !schemaIDs.includes(schemaID))) return reject(Error.InvalidParam);

					async.each(cases, (box, done) => {
						totalKeyCost += caseData[box].key_amount_per_case;
						done();
					}, async () => {

						const userBalance = await db.r
							.table('users')
							.get(user.steamID)
							.update(row => {
								return row('keyCount')
									.ge(totalKeyCost)
									.branch(
										{
											keyCount: row('keyCount').sub(totalKeyCost),
										},
										{}
									)
							})
							.run();
						if(!userBalance.replaced) return reject(Error.NotEnoughKeys);
						resolve(await this.insert(user, {cases, totalKeyCost, slots, isPrivate}));
					});
				});
			} catch (e) {
				console.log(e);
				reject(Error.APIError);
			}
		})
	}

	join(user, id) {
		return new Promise(async (resolve, reject) => {
			if(this.blocked) return reject(Error.Maintenance);
			let battle;
			try {
				battle = await db.r.table('battles').get(id).run();
				if (!battle) return reject(Error.BattleNotFound);
				if (battle.state !== this.BattleStates.Active || battle.players.length >= battle.slots) return reject(Error.BattleClosed)
				if (battle.players.some(player => player.steamID === user.steamID)) return reject(Error.BattleAlreadyIn)

				const userBalance = await db.r.table('users').get(user.steamID)
					.update(row => {
						return row('keyCount')
							.ge(battle.totalKeyCost)
							.branch({keyCount: row('keyCount').sub(battle.totalKeyCost)}, {})
					}).run();
				if(!userBalance.replaced) return reject(Error.NotEnoughKeys);

				const player = {
					steamID: user.steamID,
					username: user.username,
					avatarUrl: user.avatarUrl,
					rank: user.rank,
				};

				await db.r.table('battles').get(battle.id)
					.update({
						openedCases: db.r.row('openedCases').merge({
							[user.steamID]: [],
						}),
						players: db.r.row('players').append(player),
						expire: db.r.now().add(1800),
					}).run();

				resolve({battle, player});
			} catch (e) {
				console.log('join',e);
				this.refundKeys(user.steamID, battle.totalKeyCost);
				reject(Error.APIError);
			}
		})
	}

	async refundKeys(steamID, amount) {
		try {
			await db.r
				.table('users')
				.get(steamID)
				.update({keyCount: db.r.row('keyCount').add(amount)})
				.run()
		} catch (e) {
			console.error(`Unable to refund ${amount} keys to ${steamID}: ${err}`)
		}
	}

	checkBattle(battle) {
		return new Promise(async (resolve, reject) => {
			try {
				if (battle.expire < new Date()) {
					const battleUpdated = await db.r.table('battles').get(battle.id)
						.update(row => {
							return row('expire')
								.lt(new Date())
								.branch({state: this.BattleStates.Expired}, {})
						}).run();
					if (!battleUpdated.replaced) return console.log(`Battle ${battle.id} tried to expire but got Jebaited`)

					for (let player of battle.players) this.refundKeys(player.steamID, battle.totalKeyCost)

					resolve();

					this.io.emit('battles.expired', battle.id);
					this.io.to(`battle_${battle.id}`).emit('battle.expired', battle.id);
				} else if (battle.players.length === battle.slots) {
					const keys = await this.caseAPI.getKeyCount(config.tradeAPI.tradeUrl);
					if(keys < (battle.totalKeyCost * battle.slots)) {
						console.error(`Battle ${battle.id} has Errored: Not Enough Keys In BOT`);

						this.caseQueue.remove(({data}) => data.battleID === battle.id);

						try {
							await db.r.table('battles').get(battle.id).update({state: this.BattleStates.Errored}).run();
							for (let player of battle.players) this.refundKeys(player.steamID, battle.totalKeyCost)

							this.io.emit('battles.errored', battle.id);//ADD BATTLE ERROR
							this.io.to(`battle_${battle.id}`).emit('battle.errored', battle.id);
							return reject(`Battle ${battle.id} has Errored: Not Enough Keys In BOT`)
						} catch (e) {
							return reject(`Unable to set Errored state of battle ${battle.id}: ${err}`)
						}
					}
					const casesToOpen = Object.entries(battle.cases.reduce((acc, val) => (acc[val] = acc[val] + 1 || 1) && acc, {}));
					const offerIDs = [];
					async.eachLimit(casesToOpen, 1, ([schemaID, amount], done) => {

						console.log(amount, schemaID);
						schemaID = parseInt(schemaID);

						db.r.table('boxes').get(schemaID).run((err, caseSchema) => {
							if(err) return done(Errors.APIError);
							this.caseQueue.push({
								schemaID,
								amount: amount * battle.players.length,
								battleID: battle.id
							}, async (err, offerID) => {
								if (err) return done(`Unable to request case in battle ${battle.id}: ${err}`);

								let cases = []
								let cut = (caseSchema.key_amount_per_case * 250) * 0.10;

								for (let player of battle.players) {
									cases = cases.concat(
										new Array(amount).fill({
											offerID,
											schemaID,
											userID: player.steamID,
											caseID: null,
											refID: null,
											state: RequestStates.Sent,
											item: null,
											date: new Date(),
											openDate: null,
											cut,
											affCut: 0,
											battleID: battle.id,
										})
									)
								}

								try {
									await db.r.table('cases').insert(cases).run();
									offerIDs.push(offerID);
									setTimeout(() => {
										done()
									}, 3000);
								} catch (e) {
									console.log(e);
									done(`Unable to insert case in battle ${battle.id}: ${e}`);
								}
							});
						});
					}, async (err) => {
						if (err) {
							console.error(`Battle ${battle.id} has Errored: ${err}`)

							this.caseQueue.remove(({data}) => data.battleID === battle.id);

							try {
								await db.r.table('battles').get(battle.id).update({state: this.BattleStates.Errored}).run();
								for (let player of battle.players) this.refundKeys(player.steamID, battle.totalKeyCost)

								this.io.emit('battles.errored', battle.id);
								this.io.to(`battle_${battle.id}`).emit('battle.errored', battle.id);
								return reject(err)
							} catch (e) {
								return reject(`Unable to set Errored state of battle ${battle.id}: ${err}`)
							}
						} else {
							console.log(offerIDs);
							try {
								const battleUpdated = await db.r.table('battles').get(battle.id).update({
									state: this.BattleStates.Pending,
									offerIDs
								}, {returnChanges: true}).run();
								this.startBattleOfferUpdater(battle.id, offerIDs);

								this.io.emit('battles.pending', battleUpdated.changes[0].new_val);
								this.io.to(`battle_${battle.id}`).emit('battle.pending', battleUpdated.changes[0].new_val);

								return resolve()
							} catch (e) {
								return reject(`Unable to set Pending state of battle ${battle.id}: ${e}`)
							}
						}
					});
					/*async.parallel(
						Object.entries(battle.cases.reduce((acc, val) => (acc[val] = acc[val] + 1 || 1) && acc, {})).map(
							([schemaID, amount]) => {
								return done => {
									schemaID = parseInt(schemaID);
									setTimeout(() => {
										this.caseQueue.push({
											schemaID,
											amount: amount * battle.players.length,
											battleID: battle.id
										}, async (err, offerID) => {
											if (err) return done(`Unable to request case in battle ${battle.id}: ${err}`);
											/!*this.tradeAPI.acceptOffer(offerID)
												.then(result => {
													console.log(result);
												})
												.catch(err => console.log(err));*!/
											let cases = []
											for (let player of battle.players) {
												cases = cases.concat(
													new Array(amount).fill({
														offerID,
														schemaID,
														userID: player.steamID,
														caseID: null,
														refID: null,
														state: RequestStates.Sent,
														item: null,
														date: new Date(),
														openDate: null,
														cut: 25,
														affCut: 0,
														battleID: battle.id,
													})
												)
											}
											try {
												await db.r.table('cases').insert(cases).run();
												done(null, offerID)
											} catch (e) {
												console.log(e);
												done(`Unable to insert case in battle ${battle.id}: ${e}`);
											}
										});
									}, 5000);
								}
							}
						),
						async (err, offerIDs) => {
							if (err) {
								console.error(`Battle ${battle.id} has Errored: ${err}`)
								this.caseQueue.remove(({data}) => data.battleID === battle.id);
								try {
									await db.r.table('battles').get(battle.id).update({state: this.BattleStates.Errored}).run();
									for (let player of battle.players) this.refundKeys(player.steamID, battle.totalKeyCost)
									this.io.emit('battles.errored', battle.id);
									this.io.to(`battle_${battle.id}`).emit('battle.errored', battle.id);
									return reject(err)
								} catch (e) {
									return reject(`Unable to set Errored state of battle ${battle.id}: ${err}`)
								}
							} else {
								console.log(offerIDs);
								try {
									const battleUpdated = await db.r.table('battles').get(battle.id).update({
										state: this.BattleStates.Pending,
										offerIDs
									}, {returnChanges: true}).run();
									//this.startBattleOfferUpdater(battle.id, offerIDs);
									this.io.emit('battles.pending', battleUpdated.changes[0].new_val);
									this.io.to(`battle_${battle.id}`).emit('battle.pending', battleUpdated.changes[0].new_val);
									return resolve()
								} catch (e) {
									return reject(`Unable to set Pending state of battle ${battle.id}: ${e}`)
								}
							}
						}
					)*/
				} else if (battle.players.length > battle.slots) {
					try {
						await db.r.table('battles').get(battle.id)
							.update({
								players: battle.players.splice(0, battle.slots),
								openedCases: db.r.literal(
									db.r.row('openedCases').without(...battle.players.map(player => player.steamID))
								),
							}).run();

						for (let player of battle.players) this.refundKeys(player.steamID, battle.totalKeyCost)

						resolve()
					} catch (e) {
						return reject(`Unable to remove race condition players of battle ${battle.id}: ${e}`)
					}
				} else {
					resolve();
				}
			} catch (e) {
				console.log(e);
				reject(e);
			}
		});
	}

	updateBattles(cb) {
		db.r.table('battles').getAll(this.BattleStates.Active, {index: 'state'}).run()
			.then(async battles => {
				if(!battles) return cb();
				for(let i=0; i < battles.length; i++) {
					try {
						await this.checkBattle(battles[i]);
					} catch (e) {
						console.log('checkBattles', e);
					}
				}
				cb();
			})
			.catch(err => {
				cb(err);
			});
	}

	startBattleOfferUpdater(battleID, offerIDs) {
		if(!this.activeChecks[battleID]) {
			this.activeChecks[battleID] = setInterval(() => {
				(cb => {
					let totalKeyCost = 0;
					db.r
						.table('cases')
						.getAll(db.r.args(offerIDs), {index: 'offerID'})
						.filter(
							db.r
								.row('state')
								.eq(RequestStates.Sent)
								.or(db.r.row('state').eq(RequestStates.Pending))
								.or(db.r.row('state').eq(RequestStates.Limbo))
						)
						.orderBy(db.r.desc('date'))
						.run((err, cases) => {
							if (err) return cb(`Unable to get cases: ${err}`)
							if (!cases.length) {
								db.r
									.table('battles')
									.get(battleID)
									.update({state: this.BattleStates.Success}, {returnChanges: true})
									.run((err, results) => {
										if (err) return cb(`Unable to set Success status: ${err}`)

										clearInterval(this.activeChecks[battleID]);
										delete this.activeChecks[battleID];

										if (!results.changes[0]) return cb('Unable to get new_val (thats shit should never happen)')

										totalKeyCost = results.changes[0].new_val.totalKeyCost;

										for (let cases of Object.values(results.changes[0].new_val.openedCases)) {
											if (cases.length !== results.changes[0].new_val.cases.length) {
												db.r
													.table('battles')
													.get(battleID)
													.update({state: this.BattleStates.Errored})
													.run(err => {
														if (err) console.error(`Unable to set Errored status: ${err}`)
													})

												for (let player of results.changes[0].new_val.players) {
													let keysSpent = 0;
													const itemIDs = [];
													this.caseCache.get('caseSchema', (err, schema) => {
														async.each(results.changes[0].new_val.openedCases[player.steamID], (box, done) => {
															const caseSchema = _.find(schema, {id: box.schemaID});
															keysSpent += caseSchema.key_amount_per_case;
															itemIDs.push(box.item.id);
															done();
														}, () => {
															let totalKeysRefund = results.changes[0].new_val.totalKeyCost - keysSpent;
															console.log('Missing Case Error: ' + results.changes[0].new_val.totalKeyCost + ' - ' + keysSpent + ' = ' + totalKeysRefund);
															if (totalKeysRefund > 0) {
																this.refundKeys(player.steamID, totalKeysRefund)
															}
															if (itemIDs.length > 0) {
																db.r.table('users').get(player.steamID).run()
																	.then(user => {
																		this.tradeAPI.sendOffer(user.opData.long_url, itemIDs, [], (err, offerID) => {
																			if (err) return console.error(`Unable to send winner offer of battle ${results.changes[0].new_val.id}: ${err}`)

																			db.r
																				.table('trades')
																				.insert({
																					battleID: results.changes[0].new_val.id,
																					failedBattle: true,
																					offerID,
																					userID: user.steamID,
																					state: RequestStates.Sent,
																					itemsToGive: itemIDs,
																					itemsToReceive: [],
																					keyChange: 0,
																					date: db.r.now(),
																				})
																				.run(err => {
																					if (err) console.error(`Unable to insert trade record in errored player offer of battle ${results.changes[0].new_val.id}: ${err}`)
																				})
																		})
																	})
															}
														})
													});
												}

												this.io.emit('battles.errored', battleID);
												this.io.to(`battle_${battleID}`).emit('battle.errored', battleID);

												return cb('Missing openedCase')
											}
										}

										this.io.emit('battles.success', results.changes[0].new_val)
										this.io.to(`battle_${battleID}`).emit('battle.success', results.changes[0].new_val)

										setTimeout(this.startBattle, 3e3, results.changes[0].new_val);
									})
							} else {

								const requests = {}

								/*for (let c4se of cases)
									requests[c4se.offerID] = requests[c4se.offerID] ? requests[c4se.offerID].concat(c4se.id) : [c4se.id]*/
								async.each(cases, (box, done) => {
									requests[box.offerID] = requests[box.offerID] ? requests[box.offerID].concat(box.id) : [box.id];
									done();
								}, () => {
									async.eachOf(requests, (casesIDs, offerID, done) => {

										this.caseAPI.getTradeStatus(offerID, (err, result) => {
											if (err) {
												console.log(err);
												return done(err)
											}

											if(result.offer.state === RequestStates.Errored) {
												db.r
													.table('battles')
													.get(battleID)
													.update({state: this.BattleStates.Errored}, {returnChanges: true})
													.run((err, results) => {
														if (err) return cb(`Unable to set Success status: ${err}`)

														clearInterval(this.activeChecks[battleID]);
														delete this.activeChecks[battleID];

														if (!results.changes[0]) return cb('Unable to get new_val (thats shit should never happen)')

														totalKeyCost = results.changes[0].new_val.totalKeyCost;

														for (let cases of Object.values(results.changes[0].new_val.openedCases)) {
															if (cases.length !== results.changes[0].new_val.cases.length) {
																for (let player of results.changes[0].new_val.players) {
																	let keysSpent = 0;
																	const itemIDs = [];
																	this.caseCache.get('caseSchema', (err, schema) => {
																		async.each(results.changes[0].new_val.openedCases[player.steamID], (box, done) => {
																			const caseSchema = _.find(schema, {id: box.schemaID});
																			keysSpent += caseSchema.key_amount_per_case;
																			itemIDs.push(box.item.id);
																			done();
																		}, () => {
																			let totalKeysRefund = results.changes[0].new_val.totalKeyCost - keysSpent;
																			console.log('Missing Case Error: ' + results.changes[0].new_val.totalKeyCost + ' - ' + keysSpent + ' = ' + totalKeysRefund);
																			if (totalKeysRefund > 0) {
																				this.refundKeys(player.steamID, totalKeysRefund)
																			}
																			if (itemIDs.length > 0) {
																				db.r.table('users').get(player.steamID).run()
																					.then(user => {
																						this.tradeAPI.sendOffer(user.opData.long_url, itemIDs, [], (err, offerID) => {
																							if (err) return console.error(`Unable to send winner offer of battle ${results.changes[0].new_val.id}: ${err}`)

																							db.r
																								.table('trades')
																								.insert({
																									battleID: results.changes[0].new_val.id,
																									failedBattle: true,
																									offerID,
																									userID: user.steamID,
																									state: RequestStates.Sent,
																									itemsToGive: itemIDs,
																									itemsToReceive: [],
																									keyChange: 0,
																									date: db.r.now(),
																								})
																								.run(err => {
																									if (err) console.error(`Unable to insert trade record in errored player offer of battle ${results.changes[0].new_val.id}: ${err}`)
																								})
																						})
																					})
																			}
																		})
																	})
																}

																this.io.emit('battles.errored', battleID);
																this.io.to(`battle_${battleID}`).emit('battle.errored', battleID);

																return cb('Missing openedCase')
															}
														}
													})
											} else if (result.cases.length) {
												console.log('GOT CASES BATTLES');
												async.parallel(
													result.cases.map((newCase, i) => {
														return done => {
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
																	if (err) return done(Error.DatabaseError)
																	if (!results.changes[0]) return done()

																	if (results.changes[0].new_val.state === RequestStates.Success) {
																		db.r
																			.table('battles')
																			.get(battleID)
																			.update(row => {
																				return {
																					openedCases: row('openedCases').merge({
																						[results.changes[0].new_val.userID]: row('openedCases')(
																							results.changes[0].new_val.userID
																						).append(results.changes[0].new_val),
																					}),
																				}
																			})
																			.run(err => {
																				if (err) {
																					done(`Unable to set Success state: ${err}`)
																				} else done()
																			});

																		const date = this.getAutismTime()

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
																	} else if (results.changes[0].new_val.state === RequestStates.Errored) {
																		db.r
																			.table('battles')
																			.get(battleID)
																			.update({state: this.BattleStates.Errored})
																			.run(err => {
																				if (err) {
																					this.refundKeys(results.changes[0].new_val.userID, totalKeyCost);
																					return cb(`Unable to set Errored state: ${err}`)
																				}


																				this.refundKeys(results.changes[0].new_val.userID, totalKeyCost);


																				this.io.emit('battles.errored', battleID)
																				this.io.to(`battle_${battleID}`).emit('battle.errored', battleID)

																				cb()
																			})
																	}
																})
														}
													}),
													done
												)
											} else {
												const newState = this.StateConvert[result.offer.state]

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
														if (err) return done(Error.DatabaseError)
														if (
															!results.changes[0] ||
															results.changes[0].new_val.state === RequestStates.Sent ||
															results.changes[0].new_val.state === RequestStates.Pending ||
															results.changes[0].new_val.state === RequestStates.Limbo
														)
															return done()

														db.r
															.table('battles')
															.get(battleID)
															.update({state: this.BattleStates.Errored})
															.run(err => {
																if (err) return cb(`Unable to set Errored state: ${err}`)

																this.io.emit('battles.errored', battleID)
																this.io.to(`battle_${battleID}`).emit('battle.errored', battleID)

																cb();
															})
													})
											}
										})
									}, (err) => {
										if (err) console.log('BattleCaseCheck', err);
										cb();
									})
								})
							}
						})
				})(err => {
					if (err) console.error(`Unable to update cases of battle ${battleID}: ${err}`)
				})
			}, 5e3)
		}
	}

	startBattle(battle) {
		if(this.battlesStarted.indexOf(battle.id) === -1) {
			this.battlesStarted.push(battle.id);
			let counter = battle.currentRound || 0

			const interval = setInterval(async () => {
				if (++counter > battle.cases.length) {
					clearInterval(interval)

					let sums = {},
						itemsValue

					for (let [steamID, cases] of Object.entries(battle.openedCases)) {
						for (let c4se of cases) {
							sums[steamID] = sums[steamID] + c4se.item.suggested_price_floor || c4se.item.suggested_price_floor
							itemsValue = itemsValue + c4se.item.suggested_price_floor || c4se.item.suggested_price_floor
						}
					}

					sums = Object.entries(sums).sort((a, b) => b[1] - a[1])

					sums = sums.filter(val => val[1] === sums[0][1])

					const winnerID = sums.length === 1 ? sums[0][0] : sums[Math.floor(Math.random() * sums.length)][0],
						items = Object.values(battle.openedCases)
							.reduce((acc, val) => acc.concat(val), [])
							.map(c4se => c4se.item)


					const winner = await db.r.table('users').get(winnerID);
					let itemsSorted = _.sortBy(items, 'suggested_price_floor').reverse();
					const maxTax = parseInt(parseInt(itemsValue) * this.battleTax);
					console.log('Max Tax: ' +maxTax);
					let taxed = 0;

					let userWinnings = [];
					let taxedItems = [];
					let taxedItemIDs = [];
					//Get items for taxing.
					for (let i = 0; i < itemsSorted.length; i++) {
						const item = itemsSorted[i];
						if ((item.suggested_price_floor + taxed) <= maxTax) {
							console.log(item.name + ' - ' + item.suggested_price_floor);
							taxed += item.suggested_price_floor;
							taxedItems.push(item);
							taxedItemIDs.push(item.id);
						} else {
							userWinnings.push(item.id);
						}
					}
					if(!battle.winnerOfferID) {
						this.tradeAPI.sendOffer(winner.opData.long_url, userWinnings, [], async (err, offerID) => {

							if (err) {
								console.error(`Unable to send winner offer of battle ${battle.id}: ${err}`);
								offerID = null;
							}

							if(offerID) {
								db.r
									.table('trades')
									.insert({
										battleID: battle.id,
										offerID,
										userID: winnerID,
										state: RequestStates.Sent,
										itemsToGive: items,
										itemsToReceive: [],
										keyChange: 0,
										date: db.r.now(),
									})
									.run(err => {
										if (err) console.error(`Unable to insert trade record in winner offer of battle ${battle.id}: ${err}`)
									})
							}

							if(taxedItemIDs.length > 0) {
								try {
									const {total_value} = await new OPSkinAPI().sellRecentItems(null, taxedItemIDs, true);
									const date = this.getAutismTime();

									await db.r
										.table('stats')
										.get(date)
										.replace(row => {
											return row.branch(
												{
													date,
													revenue: row('revenue').add(total_value.credits),
													amount: row('amount'),
													value: row('value'),
													topDay: row('topDay'),
												},
												{
													date,
													revenue: total_value.credits,
													amount: 0,
													value: 0,
													topDay: [],
												}
											)
										});
									console.log(total_value, `SOLD TAXED ITEMS FOR - $${(parseInt(total_value.credits) / 100).toFixed(2)}`)
								} catch (e) {
									console.log('ERROR SELLING TAX', e);
								}
							}

							db.r
								.table('battles')
								.get(battle.id)
								.update(
									{
										state: this.BattleStates.Finished,
										winnerID,
										winnerOfferID: offerID,
										taxedItems,
										taxed,
										totalValue: itemsValue
									},
									{returnChanges: true}
								)
								.run((err, results) => {
									if (err) return console.error(`Unable to set Finished state of battle ${battle.id}: ${err}`)

									this.battlesStarted = _.remove(this.battlesStarted, id => battle.id !== id);

									this.io.emit('battles.finished', results.changes[0].new_val)
									this.io.to(`battle_${battle.id}`).emit('battle.finished', results.changes[0].new_val)

									setTimeout(_ => {
										const pl = {
											user: battle.players.find(player => player.steamID === winnerID),
											battle: results.changes[0].new_val,
										}

										this.io.emit('stats.newUnbox', pl);

										this.addToOpenCache(pl);

										const date = this.getAutismTime(),
											items = Object.values(battle.openedCases)
												.reduce((a, b) => a.concat(b), [])
												.map(c4se => {
													return {
														case: c4se,
														user: battle.players.find(player => player.steamID === c4se.userID),
													}
												})

										db.r
											.table('stats')
											.get(date)
											.replace(row => {
												return row.branch(
													{
														date,
														amount: row('amount').add(items.length),
														value: row('value').add(itemsValue),
														topDay: row('topDay')
															.union(items)
															.orderBy(db.r.desc(row => row('case')('item')('suggested_price_floor')))
															.limit(30),
														revenue: row('revenue'),
													},
													{
														date,
														amount: items.length,
														value: itemsValue,
														topDay: db
															.r(items)
															.orderBy(db.r.desc(row => row('case')('item')('suggested_price_floor')))
															.limit(30),
														revenue: 0,
													}
												)
											})
											.run(err => {
												if (err) console.error(`Unable to update general stats in finish of battle ${battle.id}: ${err}`)
											})

										/*const schemaID = results.changes[0].new_val.schemaID.toString();
												  db.r.table('users').get(socket.user.steamID).update({
													  stats: {[schemaID]: {
														  openCount: db.r.row('stats')(schemaID)('openCount').default(0).add(1),
														  openSum: db.r.row('stats')(schemaID)('openSum').default(0).add(results.changes[0].new_val.item.suggested_price_floor)
													  }},
													  canChat: true
												  }).run(err => {
													  if(err) console.error(`Unable to update stats of user ${socket.user.steamID}: ${err}`);
												  });*/
									}, (battle.cases.length + 2.5) * 1e3)
								})
						})
					} else {
						db.r
							.table('battles')
							.get(battle.id)
							.update(
								{
									state: this.BattleStates.Finished
								},
								{returnChanges: true}
							)
							.run((err, results) => {
								if (err) return console.error(`Unable to set Finished state of battle ${battle.id}: ${err}`)

								this.battlesStarted = _.remove(this.battlesStarted, id => battle.id !== id);

								this.io.emit('battles.finished', results.changes[0].new_val)
								this.io.to(`battle_${battle.id}`).emit('battle.finished', results.changes[0].new_val)
							});
					}
				} else {
					db.r
						.table('battles')
						.get(battle.id)
						.update({currentRound: counter})
						.run(err => {
							if (err) console.error(`Unable to set currentRound of battle ${battle.id}: ${err}`)

							this.io.to(`battle_${battle.id}`).emit('battle.newRound', counter)
						})
				}
			}, 10e3)
		}
	}


	getAutismTime() {
		let date = new Date()

		if (date.getHours() < 9) date = new Date(date - 86400000)

		date.setHours(9, 0, 0, 0)

		return date
	}


}

module.exports = BattleModule;