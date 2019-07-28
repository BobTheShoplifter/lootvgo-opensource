'use strict';

const r = require('./lib/rethinkDB.js').r


var connection = null;


  r.connect({
    db: 'test'
}, function(err, conn) {
    if (err) throw err
      connection = conn;
            
      r.db('MainDB').table('data').insert({id: 'config', data: {
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
            
        .run(connection, function(err) {
          if (err) throw err;
        });
    });

      r.connect({
    db: 'test'
}, function(err, conn) {
    if (err) throw err
      connection = conn;
            
      r.db('DevDB').table('data').insert({id: 'config', data: {
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
            
        .run(connection, function(err) {
          if (err) throw err;
          process.exit(0);
        });
    });