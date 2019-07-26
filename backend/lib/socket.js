'use strict';

const config = require('../config.js').socket,
    server = require('./server.js'),
    session = require('./session.js'),
    socketIO = require('socket.io'),
    ioSession = require('express-socket.io-session'),
    io = socketIO(server, config);

io.use(ioSession(session, { autoSave: true }));

module.exports = io;
