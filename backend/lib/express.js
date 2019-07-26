'use strict';

/* TODO:
    helmet config
*/

const config = require('../config.js').express,
    session = require('./session.js'),
    express = require('express'),
    helmet = require('helmet'),
    serveStatic = require('serve-static'),
    cookieParser = require('cookie-parser'),
    app = express();

app.use(helmet());

app.set('trust proxy', config.trustProxy);

app.use(serveStatic(config.staticPath));

app.use(cookieParser());

app.use(session);

module.exports = app;
