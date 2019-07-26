'use strict';

module.exports = [{
    name: 'users',
    primaryKey: 'steamID',
    indexes: []
}, {
    name: 'data',
    primaryKey: 'id',
    indexes: []
}, {
    name: 'chat',
    primaryKey: 'id',
    indexes: ['date']
}, {
    name: 'cases',
    primaryKey: 'id',
    indexes: ['caseID', 'userID', 'date', 'openDate', 'refID', 'offerID']
}, {
    name: 'refs',
    primaryKey: 'id',
    indexes: ['userID']
}, {
    name: 'stats',
    primaryKey: 'date',
    indexes: []
}, {
    name: 'trades',
    primaryKey: 'offerID',
    indexes: ['userID', 'date']
}, {
    name: 'battles',
    primaryKey: 'id',
    indexes: ['state', 'userID', 'date']
},
    {
        name: 'transactions',
        primaryKey: 'id',
        indexes: ['userID']
    },
    {
        name: 'boxes',
        primaryKey: 'schemaID',
        indexes: ['key_amount_per_case']
    }
    ];
