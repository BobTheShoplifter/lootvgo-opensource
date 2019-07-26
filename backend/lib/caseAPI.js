'use strict'

const config = require('../config.js'),
  Errors = require('./Errors.js'),
	async = require('async'),
  requests = require('request'),
	db = require('./rethinkDB'),
	OPSkinAPI = require('./modules/OPSkinAPI'),
	_ = require('lodash'),
  API = requests.defaults({
    baseUrl: `https://${config.caseAPI.APIKey}@api-trade.opskins.com/`,
    json: true,
  }),
    Promise = require('bluebird'),
  requestP = require('request-promise');
const request = requestP.defaults({
	baseUrl: `https://api-trade.opskins.com/`,
	json: true,
});
const requestOP = request.defaults({
	baseUrl: `https://${config.caseAPI.APIKey}@api-trade.opskins.com/`,
	json: true,
});

function getKeyCount(tradeUrl) {
	return new Promise(async (resolve, reject) => {
		try {
			const resp = await requestOP.get('ICaseSite/GetKeyCount/v1', {qs: { trade_url: tradeUrl}});
			resolve(parseInt(resp.response.key_count));
		} catch (e) {
			console.log(e);
			reject(Errors.APIFetchError);
		}
	});
}

function _acceptTrade(offerID, accessToken) {
	return new Promise(async (resolve, reject) => {
		try {
			await request.post('ITrade/AcceptOffer/v1/',
				{
					auth: {
						bearer: accessToken
					},
					form: {
						offer_id: offerID
					}
				});
			resolve(true);
		} catch (e) {
			console.log('acceptTrade',e);
			if(e.error.error === 'invalid_token') {
				reject('token');
			} else {
				reject(false);
			}
		}
	})
}

function sendKeyRequest(user, caseID, amount, refID, battleOpen = false, caseSchema = {}) {
  return new Promise(async (resolve, reject) => {
    try {

    	if(!battleOpen) {
		    const keys = await getKeyCount(user.opData.long_url);
		    const totalKeys = caseSchema.key_amount_per_case * amount;

		    if (keys < totalKeys) {
			    const keysNeeded = totalKeys - keys;
			    if (keysNeeded > 100) return reject(Errors.OPAPIExceedMaxKeys);
			    try {
				    await new OPSkinAPI().purchaseKeys(user.steamID, keysNeeded);
			    } catch (e) {
				    return reject(e);
			    }
		    }
	    } /*else {
    		const keys = await getKeyCount(config.tradeAPI.tradeUrl);
    		const totalKeys = caseSchema.key_amount_per_case * amount;

    		if(keys < totalKeys) {
    			const
		    }
	    }*/

	    const keyResponse = await requestOP.post('ICaseSite/SendKeyRequest/v1',
		    {
			    form: {
				    trade_url: battleOpen ? config.tradeAPI.tradeUrl : user.opData.long_url,
				    case_id: caseID,
				    amount,
				    referral_uid: refID
			    }
		    });

	    if(!battleOpen) {
		    let tokenCheck = await db.r.table('users').get(user.steamID).pluck('refreshToken', 'accessToken', 'accessExpires').run();
		    if(new Date().getTime() > tokenCheck.accessExpires) {
			    tokenCheck.accessToken = await new OPSkinAPI(tokenCheck.accessToken).refreshAccessToken(user.steamID);
		    }
		    _acceptTrade(keyResponse.response.offer.id, tokenCheck.accessToken)
			    .then(() => {
				    resolve({offerID: keyResponse.response.offer.id, accepted: true});
			    })
			    .catch(async err => {
				    resolve({offerID: keyResponse.response.offer.id, accepted: false});
			    });
	    } else {
	    	resolve(keyResponse.response.offer.id);
	    }

    } catch (e) {
    	console.log('requestCases', e);
        return reject(Errors.APIFetchError);
    }
  });
}

function getTradeStatus(offerID, cb) {
  API('ICaseSite/GetTradeStatus/v1', { qs: { offer_id: offerID } }, (err, res, json) => {
    if (err) {
    	console.log(err);
    	return cb(Errors.APIFetchError)
    }
    if (handleErr(json, cb)) return

    cb(null, json.response)
  })
}

function getCaseSchema(cb) {
  API('ICase/GetCaseSchema/v1', (err, res, json) => {
    if (err) return cb(Errors.APIFetchError)
    if (handleErr(json, cb)) return

    cb(null, json.response.cases)
  })
}

function getOdds(schemaID = null) {
	return new Promise(async (resolve, reject) => {
		try {
			if(schemaID) {
				const resp = await requestOP.get('ICase/GetCaseOdds/v1', {qs: {cases: schemaID.toString()}});
				resolve(resp.response.cases[0]);
			} else {
				const resp = await requestOP.get('ICase/GetCaseOdds/v1');
				resolve(resp.response.cases);
			}
		} catch (e) {
			console.log(e);
			reject(Errors.APIFetchError);
		}
	});
}

function getIRLItems(SKUs) {
	return new Promise(async (resolve, reject) => {
		try {
			const shoesR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 19, def_id_filter: SKUs.join(',')}});
			const clothesR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 20, def_id_filter: SKUs.join(',')}});
			const elecR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 21, def_id_filter: SKUs.join(',')}});
			const gamesR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 22, def_id_filter: SKUs.join(',')}});
			const accesorR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 31, def_id_filter: SKUs.join(',')}});
			const digGamesR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 16, def_id_filter: SKUs.join(',')}});
			const cardsR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 13, def_id_filter: SKUs.join(',')}});
			const stickersR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 12, def_id_filter: SKUs.join(',')}});
			const opR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 24, def_id_filter: SKUs.join(',')}});
			const gfuelR = await requestOP.post(`IItem/GetItemDefinitions/v1`, {form: {app_id: 17, def_id_filter: SKUs.join(',')}});

			const preItems = [...shoesR.response.definitions, ...accesorR.response.definitions, ...clothesR.response.definitions, ...elecR.response.definitions, ...gamesR.response.definitions, ...digGamesR.response.definitions, ...cardsR.response.definitions, ...stickersR.response.definitions, ...opR.response.definitions, ...gfuelR.response.definitions];
			let items = {};

			async.each(preItems, (item, cb) => {
				//if(item.internal_app_id === 13) console.log(item.def_id, item.name);

				items[item.def_id] = {
					1: {
						"def_id": item.def_id,
						"internal_app_id": item.internal_app_id,
						"name": item.name,
						"category": null,
						"rarity": item.attributes.rarity,
						"type": null,
						"paint_index": null,
						"color": "#777777",
						"image": {
							"300px": item.image,
							"600px": item.image
						},
						"suggested_price": item.suggested_price,
						"suggested_price_floor": item.suggested_price_floor,
						"wear_tier_index": null
					}
				};

				cb();
			}, () => {
				resolve(items);
			})
		} catch (e) {
			console.log(e);
			reject(Errors.APIFetchError);
		}
	})
}

async function getCaseSchema() {
	try {
		const { response } = await requestOP('ICase/GetCaseSchema/v1');
		return response.cases;
	} catch (e) {
		console.error(e);
		return [];
	}
}

function getItems(SKUs, caseID, isVGO){
	return new Promise(async (resolve, reject) => {
		const {response} = await requestOP('ITrade/GetApps/v1/');

		const oddsResp = await requestOP('ICase/GetCaseOdds/v1', {qs: {cases: caseID.toString()}});
		const caseOdds = oddsResp.response.cases[0];

		let items = [];
		let ignoreAppID = [7,8,9,11,32,14];
		console.log(`CASEID: ${caseID}`);
		if(isVGO) {
			try {
				const {response} = await requestOP.post(`IItem/GetItems/v1`, {
					form: {
						sku_filter: SKUs.join(',')
					}
				});

				Object.entries(response.items).map(([sku, itemss]) => {
					const odds = _.find(caseOdds.odds, {sku: parseInt(sku)});
					Object.keys(itemss).map(key => {
						itemss[key].odds = odds ? odds.relative_percent : null;
						delete itemss[key].paint_index;
					});
					items.push(itemss);
				});
			} catch (e) {
				console.error(`GETITEMS ERROR: ${e}`);
			}
		} else {
			for (let app of response.apps) {
				if (ignoreAppID.indexOf(app.internal_app_id) !== -1 || app.internal_app_id === 1) continue;
				try {
					const {response} = await
						requestOP.post(`IItem/GetItemDefinitions/v1/`, {
							form: {
								app_id: app.internal_app_id,
								def_id_filter: SKUs.join(',')
							}
						});
					for (let item of response.definitions) {
						delete item.attributes.markdown_description;
						delete item.attributes.ASIN;
						delete item.attributes.item_sku;
						delete item.market_name;
						delete item.attributes.external_product_id;
						delete item.attributes.redemption_url;

						if(!item.attributes.rarity) item.attributes.rarity = 'Common';

						if (!item.image['300px']) item.image = {'300px': item.image};

						const odds = _.find(caseOdds.odds, {sku: parseInt(item.sku)});
						item.odds = odds ? odds.relative_percent : null;

						items.push({
							1: item
						});

					}
				} catch (e) {
					console.error(e);
					reject(e);
				}
			}
		}


		resolve(items);
	});
}

function getMinimumOpenVolume(cb) {
  API('ICase/GetMinimumOpenVolume/v1', (err, res, json) => {
    if (err) return cb(Errors.APIFetchError)
    if (handleErr(json, cb)) return

    cb(null, json.response.count)
  })
}

function handleErr(json, cb) {
  if (!json || typeof json !== 'object') {
    cb(Errors.APIInvalidResponse)
    return true
  }

  if (json.status !== 1) {
    if (json.message === 'Invalid user info (Trade URL or Steam ID)') cb(Errors.NoOPAccount)
    else if (json.message === 'Unable to find any cases associated with this trade offer') return true
    else {
      console.log(json.status, json.message)

      cb(Errors.APIError)
    }

    return true
  }

  return false
}

module.exports = {
	getKeyCount,
	sendKeyRequest,
	getTradeStatus,
	getCaseSchema,
	getItems,
	getMinimumOpenVolume,
	getIRLItems,
	getOdds
}
