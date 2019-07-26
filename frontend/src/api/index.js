import socket from '../lib/socket'
import * as endpoints from './endpoints'

export default {
  stats: {
    getOnlineUsers: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.STATS_ONLINEUSERS, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getRecentUnboxes: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.STATS_GETRECENTUNBOXES, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getStats: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.STATS_GETSTATS, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getCase: function(id) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.STATS_GETCASE, id, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    }
  },
  vgo: {
    getCases: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.VGO_AVAILABLECASES, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getMinKeyCount: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.VGO_GETMINKEYCOUNT, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    }
  },
  battle: {
    list() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.BATTLES_GET, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    get(id) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.BATTLE_ROOM_GET, id, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    startNow(id) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.BATTLE_STARTNOW, id, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    create(rounds, slots, privacy) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.BATTLE_CREATE, rounds, slots, privacy, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    join(id) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.BATTLE_JOIN, id, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    joinRoom(id) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.BATTLE_ROOM_JOIN, id, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    leaveRoom(id) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.BATTLE_ROOM_LEAVE, id, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    }
  },
  user: {
    get() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_GET, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getKeyCount: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_GETKEYCOUNT, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    buyKeys: function(amount) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_BUY_KEYS, amount, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getOPBalance: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_GET_OP_BALANCE, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    sellItems(ids) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_SELL_ITEMS, ids, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getCases: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_ACTIVECASES, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getCaseHistory: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_PASTCASES, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getBattleHistory: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_PASTBATTLES, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    depositKeys(amount) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_DEPOSIT_KEYS, amount, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    requestCases: function(id, amount) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_REQUESTCASE, id, amount, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    openCase: function(id, fast) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_OPENCASE, id, fast, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    getWaxInventory: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.USER_WAX_INVENTORY, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    }
  },
  chat: {
    get: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.CHAT_GET, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    send: function(msg) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.CHAT_SEND, msg, (err, resp) => {
          if (err)
            return reject({
              err: new Error(err),
              timeout: resp
            })
          resolve(resp)
        })
      })
    },
    getOnlineUsers: function() {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.CHAT_ONLINEUSERS, (err, resp) => {
          if (err)
            return reject({
              err: new Error(err),
              timeout: resp
            })
          resolve(resp)
        })
      })
    }
  },
  ref: {
    getStats: function(code) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.REF_GETSTATS, code, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    createCode: function(code, opID) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.REF_CREATECODE, code, opID, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    },
    applyCode: function(code) {
      return new Promise((resolve, reject) => {
        socket.emit(endpoints.REF_APPLYCODE, code, (err, resp) => {
          if (err) return reject(new Error(err))
          resolve(resp)
        })
      })
    }
  }
}
