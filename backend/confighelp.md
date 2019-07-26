<h1 align="center">lootvgo-opensource config help 📜</h1>

Here is the full config file, I will go over each part and explain how to configure it.

* [Domain]()

```js
'use strict'

/**
 * This is config is based off what NODE_ENV you set when starting the app. Then is used across the app to provide the needed data.
 */

const domain = {
  production: 'changeme.com', //Change to your production domain
  development: 'changeme.com', //Change to your development domain
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
			production: 'lootvgo', //Change these to what you want the DB to be named.
			development: 'lootvgo_dev',
			localhost: 'lootvgo_dev',
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
		secret: 'ChangeMe', //Come up with your own session secret, best to have a hashed on.
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
		origins: 'www.Changeme.com:* Changeme.com:* dev.Changeme.com:* localhost:*', //Change these to match your domains
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
			callbackURL: 'https://Changeme.com/auth/return', //Change to your domain
			passReqToCallback: true,
			state: true,
			customHeaders: {
				Authorization: 'Basic Authhashhere',
			},
		},
		development: {
			authorizationURL: 'https://oauth.opskins.com/v1/authorize?duration=permanent&scope=identity_basic+open_cases+balance+instant_sell_recent_items+purchase_keys',
			tokenURL: 'https://oauth.opskins.com/v1/access_token',
			clientID: '',
			clientSecret: '',
			callbackURL: 'https://dev.Changeme.com/auth/return',
			passReqToCallback: true,
			state: true,
			customHeaders: {
				Authorization: 'Basic Authhash',
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
				Authorization: 'Basic Authhash',
			},
		},
	}[process.env.NODE_ENV],
	caseAPI: {
		/**
		 * You will need to use the TradeAPI to make a Case Opening user, and add that API Key here.
		 */
		APIKey: 'CaseBotApiKey',
		CaseUID: -1, //Case Opening user UID unsure where to find it please read readme.md
	},
	tradeAPI: {
		/**
		 * These are the accounts used to trade with and use the API Key attached to that account. I would suggest having different account for production and development/localhost
		 * When you enable 2FA make sure to save the code and add it here.
		 * BotSteamID is not important.
		 */
		production: {
			apiKey: 'TradeBotApiKey',
			twoFactorSecret: '',
			pollInterval: 1000,
			pollDataPath: './main_account.pdt',
			botSteamID: '',
            tradeUrl: 'https://trade.opskins.com/t/'
		},
		development: {
			apiKey: 'TradeBotApiKey',
			twoFactorSecret: '',
			pollInterval: 1000,
			pollDataPath: './dev_account.pdt',
			botSteamID: '',
			tradeUrl: 'https://trade.opskins.com/t/'
		},
		localhost: {
			apiKey: 'TradeBotApiKey',
			twoFactorSecret: '',
			pollInterval: 1000,
			pollDataPath: './dev_account.pdt',
			botSteamID: '',
			tradeUrl: 'https://trade.opskins.com/t/'
		},
	}[process.env.NODE_ENV],
}
```

## Domain

Lets start with the field

```js 
const domain = {
  production: 'changeme.com', //Change to your production domain
  development: 'changeme.com', //Change to your development domain
  localhost: 'localhost:8085',
}[process.env.NODE_ENV]
```

Change these to your domain the development can be for example dev.example.com

When adding a new domain you got to remember to change the socket orgins

```js
socket: {
		transports: ['websocket'],
		origins: 'www.example.com:* example.com:* dev.example.com:* localhost:*', //Change these to match your domains
		serveClient: false,
	},
 ```
 
 You will also have to add your domain to the ```callbackURL``` but we will come back to this.
 
 ## Database

```js 
db: {
			production: 'lootvgo', //Change these to what you want the DB to be named.
			development: 'lootvgo_dev',
			localhost: 'lootvgo_dev',
		}[process.env.NODE_ENV],
		user: 'admin',
		password: {
			production: '',
			development: '',
			localhost: ''
		}[process.env.NODE_ENV],
		silent: false,
	},
```
The database field can be left almost untouched by the user i do recommend adding a database password before production but its not needed for setting up the site. To read more about rethinkdb passwords and user accounts [click here](https://www.rethinkdb.com/docs/permissions-and-accounts/) 

 ## Session

```js
session: {
		cookie: {
			domain,
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60e3,
			sameSite: 'lax',
			secure: true,
		},
		secret: 'ChangeMe', //Come up with your own session secret, best to have a hashed on.
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
  ```
  
  Only think you need to change here is your secret as the name implies keep this secret!!
  
  ## Auth
  
  ```js
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
			callbackURL: 'https://Changeme.com/auth/return', //Change to your domain
			passReqToCallback: true,
			state: true,
			customHeaders: {
				Authorization: 'Basic Authhashhere',
			},
		},
		development: {
			authorizationURL: 'https://oauth.opskins.com/v1/authorize?duration=permanent&scope=identity_basic+open_cases+balance+instant_sell_recent_items+purchase_keys',
			tokenURL: 'https://oauth.opskins.com/v1/access_token',
			clientID: '',
			clientSecret: '',
			callbackURL: 'https://dev.Changeme.com/auth/return',
			passReqToCallback: true,
			state: true,
			customHeaders: {
				Authorization: 'Basic Authhash',
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
				Authorization: 'Basic Authhash',
			},
		},
	}[process.env.NODE_ENV],
  ```
  
  This step is a bit hard but i will try to explain as easy as it gets.
  
  First you can change the ```callbackURL``` to your domain's
  
  Then go to https://repl.it/languages/nodejs and input ```Buffer.from("apikey here" + ":").toString("Base64");``` and press run.
  ![repl.it](https://i.gyazo.com/63fa3ff41988a868210c917c94e5b21f.png)
  
  
  when you get your hashed api key go to https://apitester.com/ and do it like its in the image
  ![apitester](https://i.gyazo.com/f48d031873913089d0709dbc386e169b.png)
  
  * url : https://api.opskins.com/IOAuth/CreateClient/v1/
  * post data : name=Domain.com&redirect_uri=https://domain.com/auth
  
  Press add request headers
  * Header name : Authorization
  * Header value : Basic Hashedkeyhere
  
  When you have done that you should get a client id and a client secret (Remember you need to do this for every domain you have)
  
  Now for the domain you just generated a client id + client secret input it in ```clientID: '',
			clientSecret: '',
      ``` 
      in the config.js of the domain in question.
     
  
  Then when that is done you will create the last hash go back to https://repl.it/languages/nodejs and input ```Buffer.from("YourclientID" + ":" + "YourclientSecret", "ascii").toString("base64")``` And press run again
  ![repl.it](https://i.gyazo.com/8115075c032bd5bf7c5d00a60ba29665.png)
  
  
  when you get this you will add that to the domain in question aswell at ```
  customHeaders: {
				Authorization: 'Basic Authhashhere',
			},
      ```
      Now when you have done that auth will be working!
      
   ## CaseAPI
	```js
	caseAPI: {
		/**
		 * You will need to use the TradeAPI to make a Case Opening user, and add that API Key here.
		 */
		APIKey: 'CaseBotApiKey',
		CaseUID: -1, //Case Opening user UID unsure where to find it please read readme.md
	},
	```
Here you will have to make yourself a new VCASE user, making a VCASE user is easy

```sh
curl -d '{"site_url":"http://yoursite.com","display_name":"yoursite"}' -H "Content-Type: application/json" -X POST https://api-trade.wax.io/IUser/CreateVCaseUser/v1/
```
When running this command you will get a response like this
```json
{"status":1,"time":1564182212,"response":{"api_key":"XXXXXXXXXXXXXXXXXXXXX","user":{"id":-1481,"steam_id":"","display_name":"yoursitetesting","avatar":"https://www.gravatar.com/avatar/d41d8cd98f00b204e9800998ecf8427e?d=identicon\u0026r=pg\u0026s=32","twofactor_enabled":false,"api_key_exists":true,"sms_phone":null,"contact_email":null,"allow_twofactor_code_reuse":false,"inventory_is_private":true,"auto_accept_gift_trades":false,"anonymous_transactions":false,"vcase_restricted":true}}}
```
You should save this information somewhere secure, now on the config file the ```CaseUID:``` is the ```"id":-1481``` from the response.
And ```APIKey``` is the ```"api_key"``` from the response.

For more info on CreateVCaseUser please checkout the docs [here](https://github.com/OPSkins/trade-opskins-api/blob/master/IUser/CreateVCaseUser.md)

  ## TradeAPI
  
  ```js
  tradeAPI: {
		/**
		 * These are the accounts used to trade with and use the API Key attached to that account. I would suggest having different account for production and development/localhost
		 * When you enable 2FA make sure to save the code and add it here.
		 * BotSteamID is not important.
		 */
		production: {
			apiKey: 'TradeBotApiKey',
			twoFactorSecret: '',
			pollInterval: 1000,
			pollDataPath: './main_account.pdt',
			botSteamID: '',
            tradeUrl: 'https://trade.opskins.com/t/'
 ```
 
 This one is pretty self explanetory this bot is for the battles and battle key deposits.
 You only need to change 3 things
 * ```apiKey``` = Your bots api key
 * ```twoFactorSecret``` = Your bots 2fa sectet you get this during 2fa setup.
 * ```tradeUrl``` your bots tradeurl
