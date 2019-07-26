'use strict'

const config = require('../config.js').tradeAPI,
const configCase = require('../config.js').caseAPI,
  db = require('./rethinkDB.js'),
  Errors = require('./Errors.js'),
    Promise = require('bluebird'),
  RequestStates = require('./RequestStates.js'),
  caseAPI = require('./caseAPI.js'),
  async = require('async'),
  fs = require('fs'),
  TradeManager = require('opskins-tradeoffer-manager'),
  request = require('request'),
  API = request.defaults({
    baseUrl: `https://${config.apiKey}@api-trade.opskins.com/`,
    json: true,
  }),
  appID = 1

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

try {
  config.pollData = JSON.parse(fs.readFileSync(config.pollDataPath, 'utf8'))
} catch (e) {}

const manager = new TradeManager(config)

API.post('IUser/UpdateProfile/v1/', {form: {allow_twofactor_code_reuse: true}}, (err, res, json) => {
	if(err) return console.log(err);
	console.log(json);
});

manager.on('newOffer', offer => {
  if (offer.sender.uid !== configCase.CaseUID) {
    manager.cancelOffer(offer.id).catch(err => {
      console.error(`Unable to cancel unknown received offer: ${err}`)
    })
  } else {
  	manager.acceptOffer(offer.id)
	    .then(_ => console.log('accepted battle offer: '+offer.id))
	    .catch(e => console.log(e));
  }
});

manager.on('pollData', state => {
  fs.writeFile(config.pollDataPath, JSON.stringify(state), err => {
    if (err) console.error(`Unable to write poll data: ${err}`)
  })
})

manager.on('unknownOfferSent', offer => {
  if (offer.sent_by_you && StateConvert[offer.state] !== RequestStates.Sent) {
    console.log(`Unknown offer sent ${offer.id} considered changed state: ${offer.state}`)
    offerChangedHandler(offer)
  } else {
    console.error(`Unknown offer sent: ${offer.id} (${offer.state})`)
  }
})

manager.on('sentOfferChanged', (offer, oldState) => {
  console.log(`Offer ${offer.id} changed state: ${offer.state} (${oldState})`)

  offerChangedHandler(offer)
})

function offerChangedHandler(offer) {
  db.r
    .table('trades')
    .get(offer.id)
    .update({ state: StateConvert[offer.state] }, { returnChanges: true })
    .run((err, results) => {
      if (err) console.error(`Unable to update trade record of offer ${offer.id}: ${err}`)

      if (!results.changes[0]) return

      if (results.changes[0].new_val.keyChange && StateConvert[offer.state] === RequestStates.Success) {
        db.r
          .table('users')
          .get(results.changes[0].new_val.userID)
          .update({ keyCount: db.r.row('keyCount').add(results.changes[0].new_val.keyChange) })
          .run(err => {
            if (err)
              console.error(
                `Unable to change keyCount of user ${results.changes[0].new_val.userID} by ${
                  results.changes[0].new_val.keyChange
                }: ${err}`
              )
          })
      }
    })
}

function getUserInventory(opUID, cb) {
	console.log(opUID);
  paginate(getUserPage, { opUID, page: 1 }, cb)
}

function getUserPage({ opUID, page }, cb) {
  API(
    '/ITrade/GetUserInventory/v1/',
    { qs: { uid: opUID, app_id: appID, sort: 4, page } },
    (err, res, json) => {
      if (err) return cb(Errors.APIFetchError)
      if (handleErr(json, cb)) return

      cb(null, json)
    }
  )
}

function acceptOffer(offerid) {
  return manager.acceptOffer(offerid)
}

function sendOffer(tradeUrl, itemsToSend, itemsToReceive, cb) {
  manager
    .sendOffer({
      trade_url: tradeUrl,
      items_to_send: itemsToSend.join(','),
      items_to_receive: itemsToReceive.join(','),
    })
    .then(offer => {
      cb(null, offer.id)
    })
    .catch(err => {
      console.error(`Unable to send offer to ${tradeUrl}: ${err}`)

      cb(Errors.APIError)
    })
}

function getOffer(offerID) {
	return new Promise((resolve, reject) => {
		API.get('ITrade/GetOffer/v1/', {qs: {offer_id: offerID}}, (err, res, json) => {
			if(err) return reject(err);
			resolve(json.response.offer);
		});
	});
}

function getBotTradeUrl() {
    return new Promise((resolve, reject) => {
        API.get('ITrade/GetTradeURL/v1/', (err, res, json) => {
            if(err) reject(err);
            console.log(json.response.long_url);
            resolve(json.response.long_url);
        });
    });
}

function getOpBalance(cb) {
  request(`https://${config.apiKey}@api.opskins.com/IUser/GetBalance/v1/`, { json: true }, (err, res, json) => {
    if (err) return cb(Errors.APIFetchError)
    if (!json || typeof json !== 'object') return cb(Errors.APIInvalidResponse)
    if (json.status !== 1) cb(Errors.APIError, json.status)

    cb(null, json.balance)
  })
}

function getOPCashouts(cb) {
  request(
    `https://${config.apiKey}@api.opskins.com/ITransactions/GetMonetaryTransactionHistory/v1/`,
    { json: true },
    (err, res, json) => {
      if (err) return cb(Errors.APIFetchError)
      if (!json || typeof json !== 'object') return cb(Errors.APIInvalidResponse)
      if (json.status !== 1) cb(Errors.APIError, json.status)

      cb(null, json)
    }
  )
}

function getOPTransferHistory(cb) {
  request(
    `https://${config.apiKey}@api.opskins.com/ITransactions/GetWalletTransactionHistory/v1/?type=19`,
    { json: true },
    (err, res, json) => {
      if (err) return cb(Errors.APIFetchError)
      if (!json || typeof json !== 'object') return cb(Errors.APIInvalidResponse)
      if (json.status !== 1) cb(Errors.APIError, json.status)

      cb(null, json)
    }
  )
}

function transferFunds(user, opUID, amount, cb) {
	request.post(
		`https://${config.apiKey}@api.opskins.com/ITransactions/TransferFunds/v1/`,
		{form: {uid: opUID, amount}, json: true},
		async (err, res, json) => {
			if (err) return cb(Errors.APIFetchError)
			if (!json || typeof json !== 'object') return cb(Errors.APIInvalidResponse)
			if (json.status !== 1) cb(Errors.APIError, json.status)
			const data = json.response;
			await db.r.table('transactions').insert({
				id: data.txid_sender,
				sentTo: parseInt(opUID),
				sentBy: user.steamID,
				amount,
				date: new Date()
			});
			cb()
		}
	)
}

function handleErr(json, cb) {
  if (!json || typeof json !== 'object') {
    cb(Errors.APIInvalidResponse)
    return true
  }

  if (json.status !== 1) {
    console.log(json.status, json.message)
    console.trace()

    cb(Errors.APIError)

    return true
  }

  return false
}

function paginate(func, args, cb) {
	func(args, (err, json) => {
		if (err) return cb(err)
		if (json.total_pages === 1) return cb(null, json.response.items)

		async.concat(
			new Array(json.total_pages).fill().map((val, i) => i + 1),
			(page, done) => {
				args.page = page

				func(args, (err, json) => {
					if (err) done(err)
					else done(null, json.response.items)
				})
			},
			cb
		)
	})
}

module.exports = {
	getUserInventory,
	sendOffer,
	getOpBalance,
	getOPCashouts,
	getOPTransferHistory,
	transferFunds,
	acceptOffer,
	getBotTradeUrl,
	getOffer
}
