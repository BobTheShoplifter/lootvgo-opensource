export const VGO_AVAILABLECASES = 'vgo.getCases'
export const VGO_GETMINKEYCOUNT = 'vgo.getMinOpen'

export const USER_GET = 'user.get'
export const USER_GETKEYCOUNT = 'vgo.getKeyCount'
export const USER_REQUESTCASE = 'vgo.requestCase'
export const USER_ACTIVECASES = 'user.getActiveCases'
export const USER_PASTCASES = 'user.getOldCases'
export const USER_PASTBATTLES = 'user.getBattleHistory'
export const USER_OPENCASE = 'user.openCase'
export const USER_WAX_INVENTORY = 'user.getInventory'
export const USER_DEPOSIT_KEYS = 'user.depositKeys'
export const USER_BUY_KEYS = 'user.buyKeys'
export const USER_GET_OP_BALANCE = 'user.getBalance'
export const USER_SELL_ITEMS = 'user.sellRecentItems'

// battles
export const BATTLES_GET = 'battle.list'

export const BATTLE_CREATE = 'battle.create'
export const BATTLE_JOIN = 'battle.join'
export const BATTLE_STARTNOW = 'battle.startNow'

export const BATTLE_ROOM_GET = 'battle.get'
export const BATTLE_ROOM_JOIN = 'battle.joinRoom'
export const BATTLE_ROOM_LEAVE = 'battle.leaveRoom'

// ref
export const REF_APPLYCODE = 'ref.setRef'
export const REF_CREATECODE = 'ref.createCode'
export const REF_GETSTATS = 'ref.getRef'

export const CHAT_GET = 'chat.get'
export const CHAT_SEND = 'chat.send'
export const CHAT_ONLINEUSERS = 'stats.getConnectedUsers'

export const STATS_GETCASE = 'stats.getCase'
export const STATS_GETSTATS = 'stats.getStats'
export const STATS_ONLINEUSERS = 'stats.getOnlineUsers'
export const STATS_GETRECENTUNBOXES = 'stats.getRecentUnboxes'

export const EVENTS = {
  user: {
    trade: 'trade.update'
  },
  battles: {
    newBattle: 'battles.newBattle',
    newPlayer: 'battles.newPlayer',
    expired: 'battles.expired',
    errored: 'battles.errored',
    success: 'battles.success',
    finished: 'battles.finished',
    pending: 'battles.pending'
  },
  battle: {
    newPlayer: 'battle.newPlayer',
    expired: 'battle.expired',
    errored: 'battle.errored',
    pending: 'battle.pending',
    success: 'battle.success',
    finished: 'battle.finished',
    newRound: 'battle.newRound'
  }
}
