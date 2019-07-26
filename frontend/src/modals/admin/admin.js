import socket from '@/lib/socket'
import { Errors } from '@/utils'

import sortBy from 'lodash-es/sortBy'

import StatsChart from './chart'

export default {
  store: ['config', 'auth', 'actions'],
  props: ['close'],
  data() {
    return {
      loading: false,
      editedConfig: null,
      opBalance: 0,
      ref: null,
      inputs: {
        whitelist: {
          name: '',
          steamID: ''
        },
        user: '',
        refCode: null,
        opskins: {
          steamid: '',
          amount: 0
        }
      },
      chartData: null,
      usr: null,
      revenue: null,
      cashouts: []
    }
  },
  watch: {
    'usr.banned': function(val, old) {
      if (old === undefined) return
      if (val === old) return
      socket.emit('admin.setBan', this.usr.steamID, val, (err, resp) => {
        if (err)
          return this.$toast.open({
            type: 'error',
            title: "Couldn't Update Ban",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })

        this.$toast.open({
          type: 'success',
          text: `User is ${val ? 'banned' : 'unbanned'}`
        })
      })
    }
  },
  created() {
    this.editedConfig = JSON.parse(JSON.stringify(this.config))

    getOpBalance()
      .then(resp => {
        this.opBalance = resp
      })
      .catch(err => {
        this.$toast.open({
          type: 'error',
          title: "Couldn't Get WAX Balance",
          text: this.$t(`errors.${Errors[err.err.message]}`) + ` (${err.err.message}) (WAX: ${err.opError})`
        })
      })

    let d = new Date()
    d.setHours(0, 0, 0, 0) // get midnight stats
    let weekAgo = d.setDate(d.getDate() - 6)

    getRevenue(weekAgo, Date.now())
      .then(resp => {
        resp = sortBy(resp, 'date')

        let datasets = [
          {
            label: 'Revenue',
            borderColor: 'red',
            borderWidth: 2,
            data: resp.map(i => {
              return {
                y: i.revenue / 100,
                x: i.date
              }
            })
          },
          {
            label: 'Cases Opened',
            borderColor: 'green',
            borderWidth: 2,
            data: resp.map(i => {
              return {
                y: i.amount,
                x: i.date
              }
            })
          }
        ]

        this.chartData = { datasets }
      })
      .catch(err => {
        this.$toast.open({
          type: 'error',
          title: "Couldn't Get Revenue",
          text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
        })
      })
  },
  methods: {
    getConfig() {
      if (this.loading) return
      this.loading = true
      fetchConfig()
        .then(resp => {
          this.config = JSON.parse(JSON.stringify(resp))
          this.editedConfig = JSON.parse(JSON.stringify(this.config))

          this.$toast.open({
            sound: false,
            text: 'Your local config has been updated.'
          })
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Load Config",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => (this.loading = false))
    },
    save() {
      if (this.loading) return
      this.loading = true

      saveConfig(this.editedConfig)
        .then(resp => {
          this.$toast.open({
            type: 'success',
            title: 'Config Updated',
            text: 'Broadcasting update to all users...'
          })
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Update Config",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => (this.loading = false))
    },
    getUser(steamid = this.inputs.user) {
      if (this.loading) return
      this.loading = true

      fetchUser(steamid)
        .then(resp => {
          if (resp === null)
            return this.$toast.open({
              type: 'error',
              text: 'User not found'
            })

          this.usr = resp
          console.log(resp)
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Get User",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => (this.loading = false))
    },
    setWithdrawLimit(steamid, limit = this.usr.withdrawLimit) {
      if (!steamid || limit === '') return
      if (this.loading) return
      this.loading = true

      setWithdrawLimit(steamid, limit)
        .then(resp => {
          this.$toast.open({
            type: 'success',
            title: 'User Withdraw Limit Updated',
            text: `Updated user's withdraw limit to $${this.$options.filters.currencyInt(limit)}.`
          })
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Set Withdraw Limit",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => (this.loading = false))
    },
    opTransfer(steamid = this.inputs.opskins.user, balance = this.inputs.opskins.amount) {
      if (!steamid || !balance) return
      if (this.loading) return
      this.loading = true

      balance = Math.floor(balance * 100)

      transferOpBalance(steamid, balance)
        .then(resp => {
          this.opBalance -= balance
          this.$toast.open({
            type: 'success',
            title: 'Balance Transfered',
            text: `Sent $${this.$options.filters.currencyInt(balance)} to ${steamid}.`
          })
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Send WAX Balance",
            text: this.$t(`errors.${Errors[err.err.message]}`) + ` (${err.err.message}) (WAX: ${err.opError})`
          })
        })
        .finally(() => (this.loading = false))
    },
    getRef(code = this.inputs.refCode) {
      if (!code) return
      if (this.loading) return
      this.loading = true

      this.actions.ref
        .getStats(code)
        .then(resp => {
          this.ref = resp
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Get Stats",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => (this.loading = false))
    }
  },
  mounted() {
    //

    getCashoutHistory()
      .then(resp => {
        let data = resp.response.transactions
        data = data.filter(i => i.type === 'cashout' && i.status !== 'Denied')

        // data.forEach(i => {
        //   i.timestamp = i.timestamp
        // })
        this.cashouts = data
      })
      .catch(err => {
        console.log(err)
        this.$toast.open({
          type: 'error',
          title: "Couldn't Get Cashouts Histrory",
          text: this.$t(`errors.${Errors[err.err.message]}`) + ` (${err.err.message}) (WAX: ${err.opError})`
        })
      })

    // getOPTransferHistory()
    //   .then(console.log)
    //   .catch(err => {
    //     this.$toast.open({
    //       type: 'error',
    //       title: "Couldn't Get OP Transfers Histrory",
    //       text: this.$t(`errors.${Errors[err.err.message]}`) + ` (${err.err.message}) (OPSkins: ${err.opError})`
    //     })
    //   })
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    unsavedChanges() {
      return JSON.stringify(this.editedConfig) !== JSON.stringify(this.config)
    }
  },
  components: {
    StatsChart
  }
}

function saveConfig(conf) {
  return new Promise((resolve, reject) => {
    socket.emit('config.modify', conf, (err, resp) => {
      if (err) return reject(new Error(err))
      resolve(resp)
    })
  })
}

function getRevenue(start, end) {
  return new Promise((resolve, reject) => {
    socket.emit('admin.getRevenue', start, end, (err, resp) => {
      if (err) return reject(new Error(err))
      resolve(resp)
    })
  })
}

function fetchConfig() {
  return new Promise((resolve, reject) => {
    socket.emit('config.get', (err, resp) => {
      if (err) return reject(new Error(err))
      resolve(resp)
    })
  })
}

function getOpBalance() {
  return new Promise((resolve, reject) => {
    socket.emit('admin.getOpBalance', (err, resp) => {
      if (err)
        return reject({
          err: new Error(err),
          opError: resp
        })
      resolve(resp)
    })
  })
}

function getCashoutHistory() {
  return new Promise((resolve, reject) => {
    socket.emit('admin.getCashoutHistory', (err, resp) => {
      if (err)
        return reject({
          err: new Error(err),
          opError: resp
        })
      resolve(resp)
    })
  })
}
function getOPTransferHistory() {
  return new Promise((resolve, reject) => {
    socket.emit('admin.getOPTransferHistory', (err, resp) => {
      if (err)
        return reject({
          err: new Error(err),
          opError: resp
        })
      resolve(resp)
    })
  })
}

function fetchUser(steamid) {
  return new Promise((resolve, reject) => {
    socket.emit('admin.getUser', steamid, (err, resp) => {
      if (err) return reject(new Error(err))
      resolve(resp)
    })
  })
}

function setBalance(steamid, val) {
  return new Promise((resolve, reject) => {
    socket.emit('admin.setBalance', steamid, val, (err, resp) => {
      if (err) return reject(new Error(err))
      resolve(resp)
    })
  })
}

function transferOpBalance(steamid, val) {
  return new Promise((resolve, reject) => {
    socket.emit('admin.sendBalance', steamid, val, (err, resp) => {
      if (err)
        return reject({
          err: new Error(err),
          opError: resp
        })
      resolve(resp)
    })
  })
}

function setWithdrawLimit(steamid, val) {
  return new Promise((resolve, reject) => {
    socket.emit('admin.setWithdrawLimit', steamid, val, (err, resp) => {
      if (err) return reject(new Error(err))
      resolve(resp)
    })
  })
}
