import Vue from 'vue'

import { Errors, parseCase } from '@/utils'

import Spinner from './spinner'
import anime from 'animejs'

import groupBy from 'lodash-es/groupBy'

import countTo from 'vue-count-to'

import socket from '@/lib/socket'
import { EVENTS } from '@/api/endpoints'

const BATTLE_STATES = {
  Active: 1, // Created and waiting for players
  Expired: 2, // Not enough players joined in time
  Errored: 3, // Some shit fucked up
  Closed: 4, // I would say owner closed it before expiration but im not sure it's gonna be a thing yet
  Pending: 5, // Enough players joined and it's opening the cases
  Success: 6, // Cases have been opened and weeeee
  Finished: 7 // Game finished
}

const BATTLE_STATUSES = {
  1: 'Waiting for Players', // Created and waiting for players
  5: 'Processing Cases', // Enough players joined and it's opening the cases
  6: 'Preparing Next Round', // Cases have been opened and weeeee
  7: 'Game Finished' // Cases have been opened and weeeee
}

export default {
  name: 'pageBattle',
  store: ['config', 'auth', 'actions', 'state', 'localSettings'],
  data() {
    return {
      loading: false,
      status: null,
      battle: null,
      nowStarted: false,

      currentRound: 0,
      showRoundItems: false,
      roundCases: {},

      players: {},

      roomJoined: false,
      finished: false,

      bus: new Vue(),

      tallyHandler: null,
      tally: {
        players: {},
        total: 0,
        done: false
      }
    }
  },
  beforeMount() {
    this.checkValidity(this.$route.params.id)

    this.bus.$on('spinnerFinished', () => {
      this.showRoundItems = true

      if (this.currentRound < this.battle.cases.length) {
        this.status = 'Waiting for next round'
      } else {
        this.status = 'Calculating Winner'
      }
    })

    socket.on(EVENTS.battle.newPlayer, player => {
      player.items = []
      player.cases = {}
      this.$set(this.players, player.steamID, player)
    })

    socket.on(EVENTS.battle.expired, () => {
      if (this.user && this.players[this.user.steamID]) {
        this.user.keyCount += this.battle.cases.length
      }
      this.out('This battle has expired.')
    })
    socket.on(EVENTS.battle.errored, () => this.out('Something went wrong with this battle.'))

    socket.on(EVENTS.battle.pending, battle => {
      this.status = BATTLE_STATUSES[5]
      this.parseBattle(battle)
    })

    socket.on(EVENTS.battle.success, battle => {
      this.battle.openedCases = battle.openedCases
      this.parseBattle(battle)
    })

    socket.on(EVENTS.battle.finished, battle => {
      this.battle = battle
      this.finished = true
      this.playTallyAnimation()
    })

    socket.on(EVENTS.battle.newRound, id => {
      this.currentRound = id
      this.showRoundItems = false

      for (const player of Object.values(this.players)) {
        this.roundCases[player.steamID] = player.cases[this.battle.cases[this.currentRound - 1]][0].item
        player.items.unshift(player.cases[this.battle.cases[id - 1]].shift().item)
      }

      this.status = 'Rolling Round ' + id
      this.$nextTick(() => {
        this.bus.$emit('roll')
      })
    })

    window.roll = id => {
      this.currentRound = id
      this.showRoundItems = false

      for (const player of Object.values(this.players)) {
        this.roundCases[player.steamID] = player.cases[this.battle.cases[this.currentRound - 1]][0].item
        player.items.unshift(player.cases[this.battle.cases[id - 1]].shift().item)
      }

      this.status = 'Rolling Round ' + id
      this.$nextTick(() => {
        this.bus.$emit('roll')
      })
    }
  },
  beforeRouteUpdate(to, from, next) {
    this.checkValidity(to.params.id, next)
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.spaceHandler)
    this.bus.$off('spinnerFinished')

    if (this.roomJoined) {
      this.actions.battle.leaveRoom(this.roomJoined).catch(err => {
        this.$toast.open({
          type: 'error',
          text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
        })
      })
    }

    clearInterval(this.tallyHandler)

    // remove all battle listeners
    for (const event of Object.values(EVENTS.battle)) {
      socket.removeAllListeners(event)
    }
  },
  methods: {
    checkValidity(id, cb) {
      // this.battle = btlPrev
      // this.parseBattle(btlPrev)
      // return
      this.loading = true

      this.actions.battle
        .get(id)
        .then(resp => {
          if (!resp) return this.out('This battle does not exist.', cb)
          if (resp.state === BATTLE_STATES.Expired) return this.out('This battle has expired.', cb)
          if (resp.state === BATTLE_STATES.Errored) return this.out('This battle was cancelled due to an error.', cb)
          if (resp.state === BATTLE_STATES.Closed) return this.out('This battle was closed by the creator.', cb)

          this.battle = resp
          this.parseBattle(resp)

          if (this.battle.state !== BATTLE_STATES.Finished) {
            if (this.currentRound > 0) {
              this.status = 'Waiting for next round'
            }

            // subscribe to room events
            this.actions.battle
              .joinRoom(id)
              .then(() => {
                this.roomJoined = id
                this.loading = false
              })
              .catch(err => this.out(this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`, cb))
          } else {
            this.finished = true
            this.showRoundItems = true
            this.playTallyAnimation()
            this.loading = false
          }

          if (cb) cb()
        })
        .catch(err => this.out(this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`, cb))
    },
    parseBattle(battle) {
      this.status = BATTLE_STATUSES[battle.state]
      this.currentRound = battle.currentRound

      if (battle.state === BATTLE_STATES.Finished) {
        this.currentRound = this.battle.cases.length
      }

      this.players = {}
      battle.players.forEach(player => {
        let cases = []
        battle.openedCases[player.steamID].forEach(i => cases.push(parseCase(i)))

        player.cases = groupBy(cases, 'caseID')
        player.items = []

        // move all cases to player items in right order
        if (battle.state >= BATTLE_STATES.Pending) {
          let i = 1
          for (const roundId of battle.cases) {
            if (i > this.currentRound) break
            player.items.unshift(player.cases[roundId].shift().item)
            i++
          }
        }

        if (battle.slots < this.battle.slots) {
          if (this.user && this.user.steamID === battle.userID) return
          this.$toast.open({
            type: 'info',
            text: `The creator of this battle has started the with ${battle.slots} players.`
          })
        }

        this.players[player.steamID] = player
        this.battle = battle
      })
    },
    startNow(id = this.battle.id) {
      this.actions.battle
        .startNow(id)
        .then(resp => {
          this.$toast.open({
            type: 'info',
            text: `Battle starting with ${Object.keys(this.players).length} players.`
          })
          this.battle.slots = Object.keys(this.players).length
          this.nowStarted = true
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
    },
    //
    playTallyAnimation() {
      if (!this.finished) return
      this.status = 'Tallying Results'

      this.tally.players = Object.values(this.players).reduce((acc, cur) => {
        acc[cur.steamID] = {
          start: 0,
          end: 0,
          current: 0
        }
        return acc
      }, {})

      this.tally.total = this.players[this.battle.winnerID].items.reduce((acc, i) => acc + i.price, 0)

      let round = 1
      this.tallyHandler = setInterval(() => {
        if (this._isBeingDestroyed) return clearInterval(this.tallyHandler)

        for (const key in this.tally.players) {
          if (this.tally.players.hasOwnProperty(key)) {
            this.tally.players[key].start = this.tally.players[key].end
            this.tally.players[key].end += this.players[key].items[round - 1].price
            this.tally.players[key].current = this.players[key].items[round - 1].price

            // animate price jumping up?
            this.players[key].items[round - 1].hidden = true
          }
        }

        anime({
          targets: this.$el.querySelectorAll('.price-flyoff'),
          translateY: [0, getRandomInt(-20, -90), 0],
          translateX: [0, getRandomInt(-80, 80), 0],
          opacity: [0, 1, 0],
          easing: 'easeInOutExpo',
          duration: 1300
        })

        if (round >= this.battle.cases.length) {
          clearInterval(this.tallyHandler)

          setTimeout(() => {
            // animate winner
            this.status = 'Winner Winner!'
            this.tally.done = true

            if (this.user && this.user.steamID === this.battle.winnerID) {
              this.$modal.open(
                this,
                'battleWinner',
                {
                  maxWidth: 600
                },
                this.battle
              )
            }
            // this.tally.players[this.battle.winnerID] = Object.values(this.tally.players).reduce((acc, i) => acc + i, 0)
            // Object.values(this.tally.players).forEach(i => (i = 0))
          }, 2e3)
        } else round++
      }, 1500)
    },
    out(reason, cb) {
      this.$toast.open({
        type: 'error',
        text: reason
      })

      if (cb) cb('/battles')
      else this.$router.push('/battles')
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    cases() {
      return this.state.cases.reduce(function(acc, cur, i) {
        acc[cur.id] = cur
        return acc
      }, {})
    },
    seed() {
      if (!this.battle) return 0
      else return new Date(this.battle.date).getTime() + this.currentRound
    }
  },
  components: {
    Spinner,
    countTo
  }
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const btlPrev = {
  cases: [7, 7],
  currentRound: 0,
  date: '2018-12-19T20:29:01.534Z',
  expire: '2018-12-19T22:03:35.951Z',
  id: '320f62c7-5704-4443-b617-9bca1616fdc6',
  isPrivate: false,
  offerIDs: null,
  openedCases: {
    '76561198034180259': [
      {
        affCut: 0,
        battleID: '320f62c7-5704-4443-b617-9bca1616fdc6',
        caseID: 3007914,
        cut: 25,
        date: '2018-12-19T21:33:37.373Z',
        id: '0ba51b24-e1f3-42dd-9b82-0ef78e7ebace',
        item: {
          attributes: {},
          category: 'Restricted Pistol',
          color: '#8847ff',
          def_id: 900002307,
          eth_inspect: null,
          id: 7754136,
          image: {
            '1800px':
              'https://files.opskins.media/file/vgo-img/item/desert-eagle-golden-dragon-battle-scarred-1800.png',
            '2500px':
              'https://files.opskins.media/file/vgo-img/item/desert-eagle-golden-dragon-battle-scarred-2500.png',
            '300px': 'https://files.opskins.media/file/vgo-img/item/desert-eagle-golden-dragon-battle-scarred-300.png',
            '600px': 'https://files.opskins.media/file/vgo-img/item/desert-eagle-golden-dragon-battle-scarred-600.png',
            '900px': 'https://files.opskins.media/file/vgo-img/item/desert-eagle-golden-dragon-battle-scarred-900.png'
          },
          inspect: null,
          internal_app_id: 1,
          name: 'Desert Eagle | Golden Dragon (Battle-Scarred)',
          paint_index: null,
          pattern_index: 543,
          preview_urls: null,
          rarity: 'Restricted',
          sku: 205,
          suggested_price: 488,
          suggested_price_floor: 488,
          time_created: 1545255243,
          time_updated: 1545255243,
          tradable: true,
          trade_hold_expires: null,
          type: 'Pistol',
          wear: 0.48726722598076,
          wear_tier_index: 5,
          caseId: 7
        },
        offerID: 11546965,
        openDate: null,
        refID: null,
        schemaID: 7,
        state: 9,
        userID: '76561198034180259'
      },
      {
        affCut: 0,
        battleID: '320f62c7-5704-4443-b617-9bca1616fdc6',
        caseID: 3007916,
        cut: 25,
        date: '2018-12-19T21:33:37.373Z',
        id: 'df7ea4e9-1149-4fca-bb23-494ba52efd68',
        item: {
          attributes: {},
          category: 'Restricted Rifle',
          color: '#8847ff',
          def_id: 900002310,
          eth_inspect: null,
          id: 7754138,
          image: {
            '1800px': 'https://files.opskins.media/file/vgo-img/item/m4a4-twirl-field-tested-1800.png',
            '2500px': 'https://files.opskins.media/file/vgo-img/item/m4a4-twirl-field-tested-2500.png',
            '300px': 'https://files.opskins.media/file/vgo-img/item/m4a4-twirl-field-tested-300.png',
            '600px': 'https://files.opskins.media/file/vgo-img/item/m4a4-twirl-field-tested-600.png',
            '900px': 'https://files.opskins.media/file/vgo-img/item/m4a4-twirl-field-tested-900.png'
          },
          inspect: null,
          internal_app_id: 1,
          name: 'M4A4 | Twirl (Field-Tested)',
          paint_index: null,
          pattern_index: 871,
          preview_urls: null,
          rarity: 'Restricted',
          sku: 206,
          suggested_price: 285,
          suggested_price_floor: 285,
          time_created: 1545255243,
          time_updated: 1545255243,
          tradable: true,
          trade_hold_expires: null,
          type: 'Rifle',
          wear: 0.35338959097862,
          wear_tier_index: 3,
          caseId: 7
        },
        offerID: 11546965,
        openDate: null,
        refID: null,
        schemaID: 7,
        state: 9,
        userID: '76561198034180259'
      }
    ],
    '76561198052096214': [
      {
        affCut: 0,
        battleID: '320f62c7-5704-4443-b617-9bca1616fdc6',
        caseID: 3007915,
        cut: 25,
        date: '2018-12-19T21:33:37.373Z',
        id: 'f4ead865-7f1e-475c-8284-48474c688acc',
        item: {
          attributes: {},
          category: 'Restricted SMG',
          color: '#8847ff',
          def_id: 900002320,
          eth_inspect: null,
          id: 7754137,
          image: {
            '1800px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-field-tested-1800.png',
            '2500px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-field-tested-2500.png',
            '300px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-field-tested-300.png',
            '600px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-field-tested-600.png',
            '900px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-field-tested-900.png'
          },
          inspect: null,
          internal_app_id: 1,
          name: 'MP9 | Carbon Slash (Field-Tested)',
          paint_index: null,
          pattern_index: 862,
          preview_urls: null,
          rarity: 'Restricted',
          sku: 208,
          suggested_price: 266,
          suggested_price_floor: 266,
          time_created: 1545255243,
          time_updated: 1545255243,
          tradable: true,
          trade_hold_expires: null,
          type: 'SMG',
          wear: 0.15430416166782,
          wear_tier_index: 3,
          caseId: 7
        },
        offerID: 11546965,
        openDate: null,
        refID: null,
        schemaID: 7,
        state: 9,
        userID: '76561198052096214'
      },
      {
        affCut: 0,
        battleID: '320f62c7-5704-4443-b617-9bca1616fdc6',
        caseID: 3007917,
        cut: 25,
        date: '2018-12-19T21:33:37.373Z',
        id: 'f644246b-6731-4b1e-a018-17b1f12e8386',
        item: {
          attributes: {},
          category: 'Restricted SMG',
          color: '#8847ff',
          def_id: 900002318,
          eth_inspect: null,
          id: 7754139,
          image: {
            '1800px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-factory-new-1800.png',
            '2500px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-factory-new-2500.png',
            '300px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-factory-new-300.png',
            '600px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-factory-new-600.png',
            '900px': 'https://files.opskins.media/file/vgo-img/item/mp9-carbon-slash-factory-new-900.png'
          },
          inspect: null,
          internal_app_id: 1,
          name: 'MP9 | Carbon Slash (Factory New)',
          paint_index: null,
          pattern_index: 940,
          preview_urls: null,
          rarity: 'Restricted',
          sku: 208,
          suggested_price: 569,
          suggested_price_floor: 569,
          time_created: 1545255243,
          time_updated: 1545255243,
          tradable: true,
          trade_hold_expires: null,
          type: 'SMG',
          wear: 0.045736532658339,
          wear_tier_index: 1,
          caseId: 7
        },
        offerID: 11546965,
        openDate: null,
        refID: null,
        schemaID: 7,
        state: 9,
        userID: '76561198052096214'
      }
    ]
  },
  players: [
    {
      avatarUrl:
        'https://steamcdn-a.opskins.media/steamcommunity/public/images/avatars/c9/c9ef6833d70fbf53e62903755abc78ec46f5386a_full.jpg',
      rank: 1,
      steamID: '76561198034180259',
      username: 'Argyl',
      cases: {},
      items: []
    },
    {
      avatarUrl:
        'https://steamcdn-a.opskins.media/steamcommunity/public/images/avatars/a4/a4c87f3a081ff54ccd4ce31245a41e242bc017e8_full.jpg',
      rank: 1,
      steamID: '76561198052096214',
      username: 'data *',
      cases: {},
      items: []
    }
  ],
  slots: 2,
  state: 1,
  totalKeyCost: 8,
  userID: '76561198034180259',
  winnerID: '76561198052096214',
  winnerOfferID: 11547048
}
