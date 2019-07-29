<h1 align="center">lootvgo-opensource install instructions 💻</h1>

## Server setup

You can get 50$ free in credits on DigitalOcean by clicking [this link](https://m.do.co/c/84b1ec91625e)

When it comes to server i suggest using ubuntu 16.04 but other versions of linux may work just fine.
This tutorial will specify in ubuntu 16.04

When the server is setup we will first start by installing node and npm on our server.

First run these commands
```sh 
sudo apt install curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo bash -
```
```sh
sudo apt get update
```

```sh 
sudo apt install nodejs
```

Thats it for node and npm! Now we are going to install RethinkBD (Copy paste the full command) Please also check that this is still the [latest for ubuntu](https://www.rethinkdb.com/docs/install/ubuntu/)

```sh 
source /etc/lsb-release && echo "deb http://download.rethinkdb.com/apt $DISTRIB_CODENAME main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list
wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install rethinkdb
```
Thats it for the server setup!


## Script install

Clone this where you want the files to be.

```sh
git clone https://github.com/BobTheShoplifter/lootvgo-opensource.git
```

### Backend Install

We will start by installing and configuring the backend.

```sh
cd lootvgo-opensource/backend
```

```sh
npm install
```
Once this is done you will have to add all your credentials into the config.js if your having trouble with this step please check out [confighelp.md](https://github.com/BobTheShoplifter/lootvgo-opensource/blob/master/backend/confighelp.md)

But here is the main things you need to configure is for the next step.

```js
const domain = {
  production: 'CHANGE ME', //Change to your production domain
  development: 'CHANGE ME', //Change to your development domain
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
		silent: true,
	},
	...
}
```

Now we will be setting up the database, this can be a bit finicky but it's not that hard.

Firstly start up a new terminal window (Keep the old one open we will use that later)

Type the command

```sh 
rethinkdb --bind all
```

Then Go to http://ipadresstovps:8080#tables and press "+Add Database" and add the names of the databases in the config. Then press add

![](https://i.gyazo.com/3f395ff5ddee85dc8d718e11f375950d.png)

Now go back to the other terminal window that should be in lootvgo-opensource/backend and type

```sh
npm i cross-env -g
```

```sh
npm run db-setup
```

If that runs successfully you can go to the next step if it does not there may be something wrong with your config.

When the database is setup you will have to set some default stuff in the database.

Go to http://ipadresstovps:8080#dataexplorer

You should now see this field

![Image1](https://i.gyazo.com/04393116a4a3f3c797f3f977d297602a.png)

Input the code

```sh 
r.db('lootvgo').table('data').insert({id: 'config', data: {
  "blocks": {
    "battle":true,
    "chat":false
  },
  "chatDelay":1000,
  "maintenance":{
    "active":false,
    "info":"We're adding Weapon Case 3, back in 20-40 minutes. (Your cases are unaffected) test "
  },
  "minimumVolume":1,
  "raffle":{
    "auto":true
  },
  "whitelist":{
    "enabled":false,
    "list":[
      {
        "name":"Yourname",
        "steamID":"Yoursteamid"
      }
    ]
  }
}})
```

And press run

Do this for all your databases (Replace ```r.db('lootvgo')```) with the database name.

When this is done go back to the terminal you started RethinkDB in.

Press ctrl + c or ctrl + z this should stop the database

now type

```sh
screen
```

Press space and type

```sh
rethinkdb
```

Your backend should now be running fine! You will need to finish your config file before starting the server. Need help with the config check this out [confighelp.md](https://github.com/BobTheShoplifter/lootvgo-opensource/blob/master/backend/confighelp.md)

When your config is done you can run

```sh
npm i pm2 -g
```

#### Development mode
```sh 
WINDOWS - npm run start-windows
LINUX - npm run start
```

#### Production deployment
This should most likely be used as the Development mode is a bit joinky.
```sh 
npm run start-production
```

### Frontend Install

The frontend is mostly done for you not much you need to do yourself.

```sh 
cd lootvgo-opensource/frontend
```

```sh 
npm install
```

#### Development mode
```sh 
npm run start
```

This will start it on devdomain.com:8085, vpsip:8085 or localhost:8085

## Deployment

### Backend Deployment

When you go to run the backend in production you will run:
```
npm run start-production
```

This will run the app with NODE_ENV=production, thus using the production configs!

### Frontend Deployment

To deploy the frontend isn't very hard, you will need to have some know how on Apache or Nginx web servers.

First command you will need to run is npm run build, this will build the frontend and save it in /dist.
```
npm run build
```

**Then**

![](https://i.gyazo.com/72552491525e1c9fc45f70937951dc92.png)

```
Move files from /dist to where they can be served over HTTP
```

**If you are using Nginx here is a reverse proxy**

```sh
cd /etc/nginx/sites-available
```
open default file

add this under server_name _;

```
location / {
		proxy_pass http://localhost:8123;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
	}
```

![](https://i.gyazo.com/5f5b44ab79fbaf0e56fb0c6b841a11d8.png)


**Note: index.html in dist, needs to be served over HTTP for it to work properly**

![](https://i.gyazo.com/434b2f9276f94723847fbdb130cd48d0.png)

## Setting ranks

To set your rank please open the ```set-ranks.js``` in the backend folder with filezilla or your ftp software.

```js
'use strict';

const r = require('./lib/rethinkDB.js').r


var connection = null;


  r.connect({
    db: 'DatabaseNameHere'
}, function(err, conn) {
    if (err) throw err
      connection = conn;
            
      r.db('DatabaseNameHere').table('users').get('STEAMID_OR_OPUID').update({rank: 1})
            
        .run(connection, function(err) {
          if (err) throw err;
          console.log(`Rank was set!`)
          process.exit(0);
        });
    });
```
// User 0
// Admin 1
// Mod 2
// Verified 3

Edit the DatabaseNameHere to your main database and add your steamid/opskins id. If you have steam linked you must use steamid.
Then set the rank to the prefered new rank.
