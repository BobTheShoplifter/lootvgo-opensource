'use strict';

const config = require('../config.js').rethinkDB,
    r = require('rethinkdbdash')(config);

function getUser(steamID, cb) {
    r.table('users').get(steamID).run(handleErr(cb));
}

function insertUser(user, cb) {
    r.table('users').insert(user, { conflict: 'update' }).run(handleErr(cb));
}

function getConfig(cb) {
    r.table('data').get('config')('data').default(null).run(handleErr(cb));
}

function getRecentChat(cb) {
    r.table('chat')
        .orderBy({ index: r.desc('date') })
        .filter({ hidden: false })
        .limit(25)
        .merge({ user: r.table('users').get(r.row('steamID')).pluck('steamID', 'username', 'avatarUrl', 'rank', 'muteExp') })
        .without('steamID')
        .run(handleErr(cb));
}

function handleErr(cb) {
    return (err, results) => {
        cb(err || (results && results.first_error) || null, results);
    };
}

module.exports = {
    r,
    getUser,
    insertUser,
    getConfig,
    getRecentChat
};
