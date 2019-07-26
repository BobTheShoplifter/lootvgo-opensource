export default {
  state: {
    authenticated: false,
    user: null
  },

  get() {
    return this.state
  },

  checkAuth() {
    return new Promise((resolve, reject) => {
      this.socket.emit('user.get', (err, user) => {
        if (err) return reject(new Error(err))

        this.state.authenticated = !!user
        this.state.user = user
        resolve(this.state)
      })
    })
  },

  init(socket) {
    this.socket = socket
    return this.checkAuth()
  }
}

// let lastToken
// ;(done => {
//   if (
//     localStorage.token &&
//     typeof localStorage.tokenExp === 'number' &&
//     localStorage.tokenExp > Math.floor(new Date() / 1e3)
//   ) {
//     lastToken = localStorage.token
//     done()
//   } else {
//     updateToken(done)
//   }
// })((err, isLogged) => {
//   if (err) return // rip

//   primus.open()

//   if (isLogged) waitForTokenExp()
// })

// function updateToken(cb) {
//   ajax.post('https://turbo.gg/auth/getToken', (err, json) => {
//     if (err) return cb(err)
//     if (!json.success) return cb(json.error)

//     if (json.isLogged) {
//       lastToken = localStorage.token = json.token
//       localStorage.tokenExp = json.tokenExp
//     }

//     cb(null, json.isLogged)
//   })
// }

// function waitForTokenExp() {
//   setTimeout(_ => {
//     if (
//       localStorage.token !== lastToken &&
//       localStorage.tokenExp > Math.floor(new Date() / 1e3)
//     )
//       return waitForTokenExp()

//     updateToken(err => {
//       if (err); // rip

//       waitForTokenExp()
//     })
//   }, localStorage.tokenExp - Math.floor(new Date() / 1e3))
// }
