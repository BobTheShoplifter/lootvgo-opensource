const request = require('request-promise');
const Promise = require('bluebird');
const db = require('../rethinkDB');
const Error = require('../Errors');
const _ = require('lodash');

const config = require('../../config');

/**
 * I'm going to be redoing this bit, to be not as hacky. But its good for right now, and its 2am and I work in the am lolol. fuuuu.... :pepecry:
 */

class OPSkinAPI {
	constructor() {
		this.request = request.defaults({
			json: true
		});

		this.oauthHash = 'Basic ' + Buffer.from(config.auth.clientID + ':' + config.auth.clientSecret, 'ascii').toString('base64');
		this.hash = 'Basic ' + Buffer.from(config.tradeAPI.apiKey + ':', 'ascii').toString('base64')

		this.appIDToOTHERAPPID = null;
	}

	async setAppIDs() {
		this.appIDToOTHERAPPID = {};
		const {response} = await this.request.get('https://api-trade.opskins.com/ITrade/GetApps/v1/');
		for(let key in response.apps) {
			const app = response.apps[key];
			console.log(app);
			this.appIDToOTHERAPPID[app.internal_app_id] = app.steam_app_id;
		}
	}

	async getShitAppID(appID) {
		const {response} = await this.request.get('https://api-trade.opskins.com/ITrade/GetApps/v1/');
		for(let key in response.apps) {
			const app = response.apps[key];
			if(app.internal_app_id === appID) {
				return app.steam_app_id;
			}
		}
	}

	refreshAccessToken(steamID) {
		return new Promise( async (resolve, reject) => {
			try {
				const user = await db.r.table('users').get(steamID).pluck('refreshToken').run();
				const token = await this.request.post('https://oauth.opskins.com/v1/access_token',
					{
						form: {
							grant_type: 'refresh_token',
							refresh_token: user.refreshToken
						},
						headers: {
							authorization: this.oauthHash,
						}
					});
				await db.r.table('users').get(steamID).update({accessToken: token.access_token, accessExpires: new Date().getTime() + 1800000});
				resolve(token.access_token);
			} catch (e) {
				//console.log('REFRESH TOKEN ERROR',e);
				reject(Error.OPAPIError);
			}
		});
	}

	async getInstantSellValue(marketName, appid) {
		try {
			let shitAppID =  await this.getShitAppID(appid);
			const resp = await this.request.get(`https://api.opskins.com/IPricing/GetInstantSellPrice/v1/`, {
				qs: {
					market_name: marketName,
					appid: shitAppID,
					contextid: 1
				},
				headers: {
					authorization: this.hash
				}
			});

			console.log(resp);

			if(resp.status === 1) {
				return {usd: resp.response.instant_sell_price_usd, op: resp.response.instant_sell_price_credits};
			} else {
				Promise.reject(Error.OPAPIError);
			}
		} catch (e) {
			console.log(e);
			Promise.reject(Error.OPAPIError);
		}
	}

	sellRecentItems(steamID, itemIDs, forTax = false) {
		return new Promise(async (resolve, reject) => {
			if(forTax) {
				try {
					const response = await this.request.post(`https://${config.tradeAPI.apiKey}@api-trade.opskins.com/IItem/InstantSellRecentItems/v1/`,
						{
							form: {
								item_id: itemIDs.join(','),
								instant_sell_type: 1
							}
						});

					if (response.status === 1) {
						const {isales_instantsellitems_v1} = response.response;
						const {balance} = isales_instantsellitems_v1;
						const {items_count, total_value, status} = isales_instantsellitems_v1.response;

						if (status === 2000) return reject(Error.OPAPIError);
						if (status === 202) return reject(Error.OPAPIInstantSellError);

						return resolve({balance, items_count, total_value});
					}
				} catch (e) {
					console.log(e);
					reject(e);
				}

			} else {
				if (!steamID || !_.isArray(itemIDs) || itemIDs.length <= 0) reject(Error.InvalidParam);
				if (itemIDs.length > 100) reject(Error.OPAPIExceedMaxItems);
				try {
					let tokenCheck = await db.r.table('users').get(steamID).pluck('accessToken', 'accessExpires').run();
					if (new Date().getTime() > tokenCheck.accessExpires) tokenCheck.accessToken = await this.refreshAccessToken(steamID);
					const response = await this.request.post('https://api-trade.opskins.com/IItem/InstantSellRecentItems/v1/',
						{
							form: {
								item_id: itemIDs.join(','),
								instant_sell_type: 1
							},
							auth: {
								bearer: tokenCheck.accessToken,
								sendImmediately: true
							}
						});

					if (response.status === 1) {
						const {isales_instantsellitems_v1} = response.response;
						const {balance} = isales_instantsellitems_v1;
						const {items_count, total_value, status} = isales_instantsellitems_v1.response;

						if (status === 2000) return reject(Error.OPAPIError);
						if (status === 202) return reject(Error.OPAPIInstantSellError);

						resolve({balance, items_count, total_value});
					}

				} catch (e) {
					console.log('OPSKINAPI', e);
					if (e.error.status === 312) reject(Error.OPAPIInstantSellUnknownItems);
					else reject(Error.OPAPIError);
				}
			}
		})
	}

	purchaseKeys(steamID, amount) {
		return new Promise(async (resolve, reject) => {
			if(!steamID || !amount || amount <= 0) return reject(Error.InvalidParam);
			if(amount > 100) reject(Error.OPAPIExceedMaxKeys);
			try {
				let tokenCheck = await db.r.table('users').get(steamID).pluck('accessToken', 'accessExpires').run();
				if(new Date().getTime() > tokenCheck.accessExpires) tokenCheck.accessToken = await this.refreshAccessToken(steamID);
				const balances = await this.getUserBalance(steamID);
				if(balances.balanceInKeys < amount) return reject(Error.OPAPINotEnoughFunds);
				const response = await this.request.post('https://api.opskins.com/ISales/BuyKeys/v1/',
					{
						form: {
							count: amount
						},
						auth: {
							bearer: tokenCheck.accessToken,
							sendImmediately: true
						}
					});
				const buyItemData = response.response.isales_buyitems_v1;
				if(response.status === 1 && (buyItemData.status === 1 || buyItemData.status === 2000)) {
					if(buyItemData.status === 2000) return resolve({balance: buyItemData.balance, message: Error.OPAPIKeysPurchasedNoTransfer});
					resolve({balance: buyItemData.balance});
				} else {
					reject(Error.OPAPIUnableToBuyKeys);
				}
			} catch (e) {
				console.log(e);
				reject(Error.OPAPIError);
			}
		})
	}

	getUserBalance(steamID) {
		return new Promise(async (resolve, reject) => {
			try {
				let tokenCheck = await db.r.table('users').get(steamID).pluck('accessToken', 'accessExpires').run();
				if(new Date().getTime() > tokenCheck.accessExpires) tokenCheck.accessToken = await this.refreshAccessToken(steamID);
				const response = await this.request.get('https://api.opskins.com/IUser/GetBalance/v1/',
					{
						auth: {
							bearer: tokenCheck.accessToken,
							sendImmediately: true
						}
					});
				if(response.status === 1) {
					resolve({balance: response.balance, op: response.credits, balanceInKeys: response.balance_in_keys});
				} else {
					console.log('getBalanceFailButNOT',response);
					reject(Error.OPAPIError);
				}
			} catch (e) {
				console.log(e);
				reject(Error.OPAPIError);
			}
		})
	}


}

module.exports = OPSkinAPI;