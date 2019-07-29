<h1 align="center">lootvgo-opensource auto install instructions 🤖</h1>

## Server setup

You can get 50$ free in credits on DigitalOcean by clicking [this link](https://m.do.co/c/84b1ec91625e)

When it comes to server i suggest using ubuntu 16.04 but other versions of linux may work just fine.
This install script is only tested for ubuntu 16.04 it will not work on ubuntu 18.04 as rethinkdb does not have a build for it. If apache is installed on your server please uninstall it completly.

## Install script

The install script will do almost everything for you! You will still have to do some steps but this is alot easier.
You will need to have some information ready so the script can configure itself.

* Trade Bot information (API key, 2fa secret and tradelink) [For more info on this click here](https://github.com/BobTheShoplifter/lootvgo-opensource/blob/master/backend/confighelp.md#tradeapi)
* Domain (Your domain can be whatever you want but you should put it on [Cloudflare](https://www.cloudflare.com/) for better performance and ssl)
* Your username and steamid (If you have no steamid connected to opskins use your WAX id)

If you have this you can run the command in your ubuntu 16.04 console

```sh
apt-get -y install wget; wget https://bobtheshoplifter.com/wget/install.sh; bash install.sh
```

Follow the instructions on screen and input all of the things requested

When finished the script will say

```
"################################################"
"# Ubuntu LootVGO has been installed."
"################################################"
```

If not try to look for a error message.

## Configure the last parts

### You will have to configure the auth before starting the script please look [here](https://github.com/BobTheShoplifter/lootvgo-opensource/blob/master/backend/confighelp.md#auth) to see how to do that.

After configuring auth you can now finaly start the script by running

```sh
cd

cd lootvgo-opensource/backend

npm run start production
```
Now your site should be running! If you havent redirected a domain to the ip allready do that now.

If you are having issues please run.

```sh
pm2 logs 0 --lines 100
```

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
