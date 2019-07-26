'use strict';

const config = require('../config.js').session,
    r = require('./rethinkDB.js').r,
    session = require('express-session'),
    sessionRethinkDB = require('session-rethinkdb')(session);

config.store = new sessionRethinkDB(r);

module.exports = session(config);
