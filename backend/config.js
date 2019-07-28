'use strict'

/**
 * This is config is based off what NODE_ENV you set when starting the app. Then is used across the app to provide the needed data.
 */

const domain = {
  production: 'changeme.com', //Change to your production domain
  development: 'dev.changeme.com', //Change to your development domain
  localhost: 'localhost:8085',
}[process.env.NODE_ENV]

module.exports = {
	port: { //Change these to what you want
		production: 8123,
		development: 8124,
		localhost: 8124,
	}[process.env.NODE_ENV],
	maxSpam: 100,
	rethinkDB: {
		host: 'localhost',
		port: 28015,
		db: {
			production: 'Databasenamemain', //Change these to what you want the DB to be named.
			development: 'Databasedev',
			localhost: 'Databasedev',
		}[process.env.NODE_ENV],
		user: 'admin',
		password: {
			production: '',
			development: '',
			localhost: ''
		}[process.env.NODE_ENV],
		silent: false,
	},
	session: {
		cookie: {
			domain,
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60e3,
			sameSite: 'lax',
			secure: true,
		},
		secret: 'YourSocketSecret', //Come up with your own session secret, best to have a hashed on.
		name: {
			production: '_sid',
			development: '_dsid',
			localhost: '_sid',
		}[process.env.NODE_ENV],
		resave: true,
		rolling: true,
		saveUninitialized: false,
		unset: 'destroy',
	},
	express: {
		trustProxy: 1,
		staticPath: {
			production: '../frontend/dist',
			development: '../frontend/dev/dist',
			localhost: '../frontend/dist',
		}[process.env.NODE_ENV],
	},
	socket: {
		transports: ['websocket'],
		origins: 'www.changeme.com:* changeme.com:* dev.changeme.com:* localhost:*', //Change these to match your domains
		serveClient: false,
	},
	auth: {
		/**
		 * You will need to use the OPSkins OAuth API to make a client then you will need to save the data. As well you will need to hash your clientID and clientSecret
		 * Buffer.from("clientID" + ":" + "clientSecret", "ascii").toString("base64")
		 * Take that and add it to Authorization in below objects. Make sure that "Basic " is added to the front of the hash
		 */
		production: {
			authorizationURL: 'https://oauth.opskins.com/v1/authorize?duration=permanent&scope=identity_basic+open_cases+balance+instant_sell_recent_items+purchase_keys',
			tokenURL: 'https://oauth.opskins.com/v1/access_token',
			clientID: '',
			clientSecret: '',
			callbackURL: 'https://changeme.com/auth/return', //Change to your domain
			passReqToCallback: true,
			state: true,
			customHeaders: {
				Authorization: 'Basic ',
			},
		},
		development: {
			authorizationURL: 'https://oauth.opskins.com/v1/authorize?duration=permanent&scope=identity_basic+open_cases+balance+instant_sell_recent_items+purchase_keys',
			tokenURL: 'https://oauth.opskins.com/v1/access_token',
			clientID: '',
			clientSecret: '',
			callbackURL: 'https://dev.changeme.com/auth/return',
			passReqToCallback: true,
			state: true,
			customHeaders: {
				Authorization: 'Basic ',
			},
		},
		localhost: {
			authorizationURL: 'https://oauth.opskins.com/v1/authorize?duration=permanent&scope=identity_basic+open_cases+balance+instant_sell_recent_items+purchase_keys',
			tokenURL: 'https://oauth.opskins.com/v1/access_token',
			clientID: '',
			clientSecret: '',
			callbackURL: 'localhost:8124/auth/return',
			passReqToCallback: true,
			state: true,
			customHeaders: {
				Authorization: 'Basic ',
			},
		},
	}[process.env.NODE_ENV],
	caseAPI: {
		/**
		 * You will need to use the TradeAPI to make a Case Opening user, and add that API Key here.
		 */
		APIKey: 'CaseSiteApiKey',
		CaseUID: -CaseUserId, //Case Opening user UID unsure where to find it please read readme.md
	},
	tradeAPI: {
		/**
		 * These are the accounts used to trade with and use the API Key attached to that account. I would suggest having different account for production and development/localhost
		 * When you enable 2FA make sure to save the code and add it here.
		 * BotSteamID is not important.
		 */
		production: {
			apiKey: 'battlebotapikey',
			twoFactorSecret: 'battlebot2fa',
			pollInterval: 1000,
			pollDataPath: './main_account.pdt',
			botSteamID: '',
            tradeUrl: 'battlebottrade'
		},
		development: {
			apiKey: 'battlebotapikey',
			twoFactorSecret: 'battlebot2fa',
			pollInterval: 1000,
			pollDataPath: './dev_account.pdt',
			botSteamID: '',
			tradeUrl: 'battlebottrade'
		},
		localhost: {
			apiKey: 'battlebotapikey',
			twoFactorSecret: 'battlebot2fa',
			pollInterval: 1000,
			pollDataPath: './dev_account.pdt',
			botSteamID: '',
			tradeUrl: 'battlebottrade'
		},
	}[process.env.NODE_ENV],
}