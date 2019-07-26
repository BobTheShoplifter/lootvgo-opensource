'use strict';

const config = require('../config.js').auth,
    app = require('./express.js'),
    db = require('./rethinkDB.js'),
    passport = require('passport'),
    //passportSteam = require('passport-steam').Strategy;
    OAuth2Strategy = require('passport-oauth2'),
    request = require('request-promise');

const OPSkinAPI = require('./modules/OPSkinAPI');

passport.serializeUser((steamID, done) => done(null, steamID));

passport.deserializeUser((steamID, done) => {
    db.getUser(steamID, (err, user) => {
        if (err) {
            console.error(`Unable to get user on deserialize: ${err}`);
            return done('Database Error');
        }
        done(null, user);
    });
});

/*passport.use(new passportSteam(config, (req, identifier, profile, done) => {
    db.getConfig((err, conf) => {
        if (err) {
            console.error(`Unable to get config on login: ${err}`);
            return done('Database Error');
        }

        if (!conf || !conf.whitelist || !Array.isArray(conf.whitelist.list)) {
            console.error('Invalid config on login');
            return done('Internal Server Error');
        }

        if (conf.whitelist.enabled && !conf.whitelist.list.map(user => user.steamID).includes(profile._json.steamid)) return done(`Not in whitelist: ${profile._json.steamid}`);

        const user = {
            steamID: profile._json.steamid,
            username: profile._json.personaname.replace(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig, match => match === config.domain ? config.domain : '*'),
            avatarUrl: profile._json.avatarfull,
            countryCode: profile._json.loccountrycode,
            lastIp: req.headers['cf-connecting-ip']
        };

        db.getUser(user.steamID, (err, result) => {
            if (err) {
                console.error(`Unable to get user on login: ${err}`);
                return done('Database Error');
            }

            if (!result) {
                user.canChat = false;
                user.rank = 0;
                user.banned = false;
                user.muteExp = 0;
                user.created = new Date();
                user.refCode = null;
                user.ownRef = null;
                user.stats = {};
                user.keyCount = 0;
            } else if (result.banned) {
                return done('Banned');
            }

            db.insertUser(user, err => {
                if (err) {
                    console.error(`Unable to insert/update user on login: ${err}`);

                    if (!result) return done('Database Error');
                }

                done(null, user.steamID);
            });
        });
    });
}));*/

OAuth2Strategy.prototype.userProfile = (accessToken, done) => {
    request('http://api.opskins.com/IUser/GetProfile/v1/', {auth: {bearer: accessToken}, json: true}, (err, res, json) => {
        if(err || !json) return done('API Error');
        if(json.status !== 1) return done(json.message);

        done(null, json.response);
    });
};

passport.use(new OAuth2Strategy(config, async (req, accessToken, refreshToken, profile, done) => {
    //if (!profile.id64) return done('You must link a Steam account with your OPSkins account to use LootVGO.');

    db.getConfig(async (err, conf) => {
        if (err) {
            console.error(`Unable to get config on login: ${err}`);
            return done('Database Error');
        }

        if (!conf || !conf.whitelist || !Array.isArray(conf.whitelist.list)) {
            console.error('Invalid config on login');
            return done('Internal Server Error');
        }

        const idCheck = !profile.id64 ? profile.id.toString() : profile.id64;

        if (conf.whitelist.enabled && !conf.whitelist.list.map(user => user.steamID).includes(idCheck)) return done(`Not in whitelist: ${idCheck}`);

        let tradeUrl;

        try {
            tradeUrl = await request.get('https://api-trade.opskins.com/ITrade/GetTradeURL/v1/',
                {
                    json: true,
                    auth: {
                        bearer: accessToken,
                        sendImmediately: true
                    }
                });
        } catch (e) {
            done(e);
        }

        const user = {
            steamID: !profile.id64 ? profile.id.toString() : profile.id64,
            opUID: profile.id,
            hasSteam: !!profile.id64,
            username: profile.username.replace(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig, match => match === config.domain ? config.domain : '*'),
            avatarUrl: profile.avatar,
            opData: tradeUrl.response,
            countryCode: req.headers['cf-ipcountry'],
            lastIp: req.headers['cf-connecting-ip'],
            accessToken,
            refreshToken,
            accessExpires: new Date().getTime() + 1800000
        };

        /*try {
            console.log(await new OPSkinAPI(accessToken).getUserBalance(user.steamID));
            console.log(await new OPSkinAPI(accessToken).purchaseKeys(user.steamID, 1));
        } catch (e) {
            console.log(e);
        }*/

        db.getUser(user.steamID, (err, result) => {
            if (err) {
                console.error(`Unable to get user on login: ${err}`);
                return done('Database Error');
            }

            if (!result) {
                user.canChat = false;
                user.rank = 0;
                user.banned = false;
                user.muteExp = 0;
                user.created = new Date();
                user.refCode = null;
                user.ownRef = null;
                user.stats = {};
                user.keyCount = 0;
            } else if (result.banned) {
                return done('Banned');
            }

            db.insertUser(user, err => {
                if (err) {
                    console.error(`Unable to insert/update user on login: ${err}`);

                    if (!result) return done('Database Error');
                }

                done(null, user.steamID);
            });
        });
    });
}));

app.use(passport.initialize());
app.use(passport.session());

/*app.get('/auth', passport.authenticate('steam', { failureRedirect: '/' }));

app.get('/auth/return', passport.authenticate('steam', { successRedirect: '/', failureRedirect: '/' }));*/

app.get('/auth', passport.authenticate('oauth2', { failureRedirect: '/' }));

app.get('/auth/return', passport.authenticate('oauth2', { successRedirect: '/'/*, failureRedirect: '/'*/}));

/*app.get('/auth/return', passport.authenticate('steam', { failureRedirect: '/' }), (err, req, res, next) => {
    if (!err) res.redirect('/');

    if (typeof err === 'string') {
        console.error(err);
        res.send(err);
    } else {
        console.error(err.message);
        res.send('Unable to login (Steam may be down or in maintenance)');
    }

    next();
});*/

app.get('/logout', (req, res) => {
    req.session.destroy();
    req.logout();
    res.redirect('/');
});

module.exports = passport;
