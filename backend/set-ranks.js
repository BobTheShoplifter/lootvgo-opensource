'use strict';

// Admin 1
// Mod 2
// Verified 3


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

