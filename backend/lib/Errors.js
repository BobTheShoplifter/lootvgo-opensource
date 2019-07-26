'use strict';

const Errors = {
    UnknownError: -1,
    OK: 0, // No error
    Fail: 1, // Generic failure, no details
    InternalError: 2, // Problem with the server that we don't want to say too much about
    DatabaseError: 3,

    NotChanged: 875,
    CannotUseChat: 874,
    UserMuted: 873,

    InsufficientPrivilege: 74,

    RateLimited: 75,

    InvalidSyntax: 76,
    MissingParam: 77,
    InvalidParam: 78,

    InvalidCommand: 88,

    NotInWhitelist: 79,
    Maintenance: 80,
    Banned: 81,
    NotLoggedIn: 82,
    AdminBlocked: 734,

    RefAlreadySet: 200,
    RefNotFound: 201,
    RefInvalid: 202,
    RefAlreadyExist: 203,
    RefAlreadyCreated: 204,
    RefCannotUseSelf: 205,

    CaseNotFound: 300,


    BattleNotFound: 400,
    BattleClosed: 401,
    BattleAlreadyCreated: 402,
    BattleAlreadyIn: 403,
    BattleRequireThreePlus: 405,
    BattleLeastTwoPlayers: 406,
    BattleAlreadyStarted: 407,


    MinimumReached: 84,

    APIFetchError: 96, // Couldn't fetch the API
    APIInvalidResponse: 97, // API response if malformed, ie: we can't find the data we need in it
    APIError: 98, // API reponse says there was an error, most of the time cuz of success: false
    NoOPAccount: 101, // I think it means the user is trying to use the site without an opskins/express trade account
    OPAPIError: 102,
    OPAPINotEnoughFunds: 103,
    OPAPIExceedMaxKeys: 104,
    OPAPIKeysPurchasedNoTransfer: 105,
    OPAPIUnableToBuyKeys: 106,
    OPAPIExceedMaxItems: 107,
    OPAPIItemsAreNotAbleToSell: 108,
    OPAPIInstantSellUnknownItems: 109,
    OPAPIInstantSellError:110,
    SteamError: 99, // Unknown error from Steam

    NotEnoughKeys: 100
};

for (let entry of Object.entries(Errors)) {
    Errors[entry[1]] = entry[0];
}

module.exports = new Proxy(Errors, {
    get(target, name) {
        return name in target ? target[name] : parseInt(name) == name ? 'UnknownError' : -1;
    }
});
