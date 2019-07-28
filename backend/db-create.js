'use strict';

const r = require('./lib/rethinkDB.js').r


var connection = null;


  r.connect({
    db: 'test'
}, function(err, conn) {
    if (err) throw err
      connection = conn;
            
            r.dbCreate('MainDB')
            
        .run(connection, function(err) {
          if (err) throw err;
        });
    });

    r.connect({
      db: 'test'
  }, function(err, conn) {
      if (err) throw err
        connection = conn;
              
              r.dbCreate('DevDB')
              
          .run(connection, function(err) {
            if (err) throw err;
            process.exit(0);
          });
        });

