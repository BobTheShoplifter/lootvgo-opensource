// libs
import Vue from 'vue'
import socket from '@/lib/socket'
import clamp from 'lodash-es/clamp'

// components
import User from '@/components/user'
import VolumeControl from '@/components/volumeControl'
import LanguageControl from '@/components/languageControl'
import SidebarChat from '@/components/sidebar/views/chat'

import { Errors, parseItem, parseCase } from '@/utils'

export default {
  name: 'MainApp',
  props: ['loading'],
  store: ['config', 'auth', 'actions', 'state', 'localSettings'],
  data() {
    return {
      self: {
        toggles: {
          sidebarNav: true,
          sidebarChat: true
        }
      },
      caseInterval: null,
      keyInterval: null,
      loadingKeys: false,
      loadingCases: false
    }
  },
  watch: {
    '$vuetify.breakpoint': function(val) {
      this.getViewport(val)
    },
    localSettings: {
      handler(val) {
        this.$ls.set('settings', val)
      },
      deep: true
    }
  },
  methods: {
    addRecentUnbox(data, history = false) {
      if (this.state.recentWinners.length > 20) this.state.recentWinners.pop()

      if (data.battle) {
        data.battle.total = 0
        data.battle.total = data.battle.totalValue ? data.battle.totalValue - data.battle.taxed : 0

        if (!data.battle.total)
          for (const player of Object.values(data.battle.openedCases)) {
            data.battle.total += player.reduce((acc, o) => acc + o.item.suggested_price, 0)
          }

        this.state.recentWinners.unshift({
          id: data.battle.id,
          battle: data.battle,
          user: data.user,
          history
        })
      } else {
        data.case.item.caseId = data.case.schemaID
        let item = parseItem(data.case.item)
        this.state.recentWinners.unshift({
          id: data.case.id,
          caseID: data.case.caseID,
          item,
          user: data.user,
          history
        })
      }
    },
    refreshKeycount() {
      if (this.loadingKeys) return
      this.loadingKeys = true

      this.actions.user
        .getKeyCount()
        .then(count => (this.user.keys = parseInt(count)))
        .catch(err => console.error(this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`))
        .finally(() => {
          this.loadingKeys = false
        })

      this.actions.user
        .get()
        .then(user => (this.user.keyCount = user.keyCount))
        .catch(err => console.error(this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`))
        .finally(() => {
          this.loadingKeys = false
        })
    },
    getActiveCases() {
      if (this.loadingCases) return
      this.loadingCases = true

      this.actions.user
        .getCases()
        .then(cases => {
          if (JSON.stringify(this.state.pendingCases) !== JSON.stringify(cases)) {
            this.state.pendingCases = cases.map(i => parseCase(i))
          }
        })
        .catch(err => console.error(this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`))
        .finally(() => {
          this.loadingCases = false
        })
    },
    inspect(item) {
      this.$modal.open(
        this,
        'inspect',
        {
          maxWidth: 400,
          scrollable: false
        },
        item
      )
    },
    getViewport(val) {
      let content = document.querySelector('#app main.content')
      if (!content) return

      let style = window.getComputedStyle(content)
      content.style.height = val.height - (parseInt(style.paddingTop) + parseInt(style.paddingBottom)) + 'px'

      Vue.prototype.$viewport = {
        width: val.width - (parseInt(style.paddingLeft) + parseInt(style.paddingRight)),
        height: val.height - (parseInt(style.paddingTop) + parseInt(style.paddingBottom))
      }
    }
  },
  mounted() {
    // remove loading overlay when we're ready
    Promise.all([
      this.actions.vgo.getCases(),
      this.actions.stats.getRecentUnboxes(),
      this.actions.stats.getOnlineUsers(),
      this.actions.vgo.getMinKeyCount()
    ])
      .then(values => {
        let cases = values[0]
        let unboxHistory = values[1]
        this.config.minimumVolume = values[3]

        // parse case
        this.state.cases = cases.map(box => {
          return {
            id: box.id,
            name: box.name,
            keysPerCase: box.key_amount_per_case,
            url: box.image['300px'],
            keysPerCase: box.key_amount_per_case,
            remaining: box.remaining_opens,
            items: box.items
          }
        })

        unboxHistory.reverse().forEach(unbox => {
          this.addRecentUnbox(unbox, true)
        })
      })
      .catch(err => {
        this.$toast.open({
          type: 'error',
          text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
        })
      })
      .finally(() => {
        // if logged in
        if (this.user) {
          Promise.all([
            this.actions.user.getCases(),
            this.actions.user.getKeyCount(),
            this.actions.user.getCaseHistory(),
            this.actions.user.getOPBalance()
          ])
            .then(values => {
              this.state.pendingCases = values[0].map(i => parseCase(i))
              this.user.keys = parseInt(values[1])
              this.state.openedCases = values[2].map(i => parseCase(i))
              this.user.credits = values[3]

              // open terms modal if logged in and not read
              if (!this.$ls.get('termsRead')) {
                this.$modal.open(this, 'terms', {
                  persistent: true
                })
              }

              // ping cases and keys
              if (!this.keyInterval) this.keyInterval = setInterval(this.refreshKeycount, 30e3)

              if (!this.caseInterval) {
                this.caseInterval = setInterval(() => {
                  if (!!this.state.pendingCases.length) this.getActiveCases()
                }, 10e3)
              }

              // refCode detection
              if (window.getCookie('refCode')) {
                this.$modal.open(this, 'refConfirm', {
                  persistent: true,
                  maxWidth: 400
                })
              }
            })
            .catch(err => {
              console.log(err)
              this.$toast.open({
                type: 'error',
                title: "Couldn't Get User Key Count",
                text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
              })
            })
            .finally(() => {
              this.$ga.time(
                'preloader',
                'loggedIn',
                Math.round(window.performance.now() - window.perfaudits_preloaderClosed)
              )
              setTimeout(() => {
                this.$emit('update:loading', false)
              }, 500)
            })
        } else {
          this.$ga.time(
            'preloader',
            'loggedOut',
            Math.round(window.performance.now() - window.perfaudits_preloaderClosed)
          )
          setTimeout(() => {
            this.$emit('update:loading', false)
          }, 500)
        }
      })

    socket.on('stats.onlineUsers', count => (this.state.onlineUsers = count))
    socket.on('stats.newUnbox', data => this.addRecentUnbox(data))

    this.$nextTick(() => {
      this.getViewport(this.$vuetify.breakpoint)

      if (this.$vuetify.breakpoint.width < 1264) {
        this.self.toggles.sidebarNav = this.self.toggles.sidebarChat = false
      }
    })
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    sidebarActionWidth() {
      return clamp(this.$vuetify.breakpoint.width * 0.23, 350, 400)
    },
    sidebarNavWidth() {
      return clamp(this.$vuetify.breakpoint.width * 0.2, 250, 300)
    },
    recentWinners() {
      return this.state.recentWinners
    }
  },
  components: {
    User,
    VolumeControl,
    LanguageControl,
    SidebarChat
  }
}

window.getCookie = function(name) {
  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return match[2]
}
