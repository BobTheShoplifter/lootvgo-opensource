'use strict';

const r = require('./lib/rethinkDB.js').r,
    async = require('async'),
    tables = require('./tables.js');

async.waterfall([next => {
    r.tableList().run(next);
}, (tablesList, next) => {
    async.parallel(tables.filter(table => !tablesList.includes(table.name)).map(table => {
        console.log(`Creating table ${table.name}`);

        return done => r.tableCreate(table.name, { primaryKey: table.primaryKey }).run(done);
    }), next);
}, (results, next) => {
    async.parallel(tables.map(table => {
        return done => r.table(table.name).indexList().run(done);
    }), next);
}, (indexesList, next) => {
    async.parallel(indexesList.map((indexes, i) => {
        return async.apply(async.parallel, tables[i].indexes.filter(index => !indexes.includes(index)).map(index => {
            console.log(`Creating index ${index} on table ${tables[i].name}`);

            return done => r.table(tables[i].name).indexCreate(index).run(done);
        }));
    }), next);

    for (let i = 0; i < indexesList.length; i++) {
        for (let index of indexesList[i]) {
            if (!tables[i].indexes.includes(index)) console.log(`Unspecified index ${index} in table ${tables[i].name}`);
        }
    }
}, (results, next) => {
    async.parallel(tables.map(table => {
        return done => r.table(table.name).indexWait(...table.indexes).run(done);
    }), next);
}], err => {
    if (err) {
        console.error(`Unable to setup db: ${err}`);
        process.exit(1);
    } else {
        process.exit(0);
    }
});
