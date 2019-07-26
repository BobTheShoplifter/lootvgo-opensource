'use strict';

const app = require('./express.js');

module.exports = require('http').createServer(app);
