'use strict'

const RequestStates = {
  Sent: 1,

  Expired: 2,
  Cancelled: 3,
  Declined: 4,
  Invalid: 5,
  Limbo: 6,
  Pending: 7,

  Errored: 8,
  Success: 9,

  Opened: 10
}
for (let entry of Object.entries(RequestStates)) {
  RequestStates[entry[1]] = entry[0]
}

export default new Proxy(RequestStates, {
  get(target, name) {
    return name in target ? target[name] : parseInt(name) == name ? 'UnknownState' : -1
  }
})
