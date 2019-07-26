import { Howl } from 'howler'
import anime from 'animejs'

import { Errors, parseItem, parseCase } from '@/utils'

import sortBy from 'lodash-es/sortBy'
import uniqBy from 'lodash-es/uniqBy'
import shuffle from 'lodash-es/shuffle'

// import Inventory from '@/components/inventory'
// import Item from '@/components/item'

export default {
  name: 'pageReplay',
  store: ['config', 'auth', 'actions', 'state', 'localSettings'],
  data() {
    return {
      loading: false,
      replayCase: null,
      vcase: null,
      expansionLevel: 1,
      itemsPerExpansion: 20,

      // anim
      rolling: false,
      entries: [],
      sounds: null,
      opening: {
        active: false,
        loading: false
      },
      showPrice: false,
      handlers: {
        roll: null,
        tickBack: null,
        special: null
      }
    }
  },
  mounted() {
    if (!this.sounds) this.initSounds()
    window.addEventListener('keydown', this.spaceHandler)
  },
  beforeMount() {
    this.getCase()
  },
  beforeRouteUpdate(to, from, next) {
    document.querySelector('.page-content').scrollTo(0, 0)
    this.expansionLevel = 1
    this.getCase(parseInt(to.params.id), next)
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.spaceHandler)
  },
  methods: {
    getCase(id = parseInt(this.$route.params.id), cb = false) {
      if (this.loading) return
      if (!id) return
      if (Number.isNaN(id)) {
        this.$toast.open({
          type: 'error',
          text: 'This replay does not exist.'
        })

        if (cb) cb('/')
        else this.$router.push('/')
        return
      }

      this.loading = true

      this.actions.stats
        .getCase(id)
        .then(resp => {
          let data = resp.case
          data.user = resp.user

          this.vcase = this.$store.state.cases.find(i => i.id === data.schemaID)
          if (!this.vcase) {
            this.$toast.open({
              type: 'error',
              text: "This replay's case does not exist."
            })

            if (cb) cb('/')
            else this.$router.push('/')
          }

          data.item.caseId = this.vcase.id
          data.item = parseItem(data.item)

          this.replayCase = data

          if (cb) cb()
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })

          if (cb) cb('/')
          else this.$router.push('/')
        })
        .finally(() => (this.loading = false))
    },

    // animation
    roll(respin = false) {
      if (!respin) {
        if (this.rolling) return
        this.rolling = true
      }

      let monkaSFactor = getRandomFloat(5, 115)
      let rollLength = 90 * (120 + 5)

      if (respin) {
        monkaSFactor = getRandomFloat(5, 115)
        rollLength = 150 * (120 + 5)
        this.entries.length = 100

        let over500 = this.skins.filter(i => i.price > 500e2)
        let items = []

        over500.forEach(item => {
          for (let i = 0; i < Math.ceil(100 / over500.length); i++) {
            items.push({
              url: item.url,
              color: item.color
            })
          }
        })

        items = shuffle(items)
        items.forEach(i => this.entries.push(i))
      } else {
        this.entries = []

        this.skins.forEach(item => {
          let count = Math.floor(item.odds)
          count = Math.floor(count * 2)

          // if an item is under 1%, still put it in sometimes
          if (item.type !== 'knife' && count < 1) count = Math.random() < item.odds ? 1 : 0

          for (let i = 0; i < count; i++) {
            this.entries.push({
              url: item.url,
              color: item.color
            })
          }
        })

        this.entries = shuffle(this.entries)
      }

      // set winning entry
      if (respin) {
        if (this.entries.length > 160) this.entries.length = 160
        this.entries[150] = {
          url: this.replayCase.item.url,
          color: this.replayCase.item.color,
          price: this.replayCase.item.price
        }
      } else {
        if (this.entries.length > 100) this.entries.length = 100
        let price = this.replayCase.item.price

        if (this.replayCase.item.type === 'knife' || price > 1200e2) {
          this.entries[90] = {
            special: true,
            url:
              price > 500e2
                ? price > 1200e2
                  ? '/static/img/case-rainbow.png'
                  : '/static/img/case-gold.png'
                : '/static/img/case.png',
            color: '#eb4b4b'
          }
        } else {
          this.entries[90] = {
            url: this.replayCase.item.url,
            color: this.replayCase.item.color,
            price: this.replayCase.item.price
          }
        }
      }

      this.sounds.case.start.play()

      setTimeout(() => {
        this.sounds.case.holo_open.play()
        this.sounds.case.holo_spinup.play()
      }, 400)

      setTimeout(() => {
        this.sounds.case.pull[getRandomInt(1, 6)].play()
        this.sounds.case.holo_glitch.play()
      }, 500)

      let lastTick = 0
      let lastTickSoundSprite = 0

      this.handlers.roll = anime({
        targets: '.spinner .entrylist',
        translateX: -(rollLength + monkaSFactor),
        easing: [0.15, 0, 0, 1],
        duration: respin ? 15e3 : this.localSettings.animationSpeed * 1e3,
        update: anim => {
          if (this._isBeingDestroyed) return

          let px = -parseInt(anim.animations[0].currentValue)

          if (lastTick === 0) lastTick = px

          if (px > 500 && px > lastTick + 122) {
            this.sounds.case.tick.play(lastTickSoundSprite.toString())
            if (lastTickSoundSprite >= 9) lastTickSoundSprite = 0
            else lastTickSoundSprite++

            lastTick = px
          }
        }
      })

      this.handlers.roll.finished.then(() => {
        if (this._isBeingDestroyed) return
        this.handlers.roll = null

        setTimeout(() => {
          this.sounds.case.stop.play()
          this.showPrice = true
        }, 450)

        this.handlers.tickBack = anime({
          targets: '.spinner .entrylist',
          translateX: -(rollLength + 60),
          duration: 500,
          delay: 500
        })

        this.handlers.tickBack.finished.then(() => {
          if (this._isBeingDestroyed) return
          this.handlers.tickBack = null

          if (!respin && (this.replayCase.item.type === 'knife' || this.replayCase.item.price > 1200e2)) {
            this.roll(true)
            this.showPrice = false
          } else {
            setTimeout(() => {
              this.rolling = false

              this.inspect(this.replayCase.item)

              setTimeout(() => {
                this.$el.querySelector('.spinner .entrylist').removeAttribute('style')
                this.entries = []
                this.showPrice = false
              }, 300)

              this.sounds.case.reveal[getRandomInt(1, 3)].play()
              this.sounds.case.holo_open.play()
            }, 250)
          }
        })
      })
    },
    skipAnim() {
      if (!this.rolling) return

      if (this.handlers.roll) {
        this.sounds.case.holo_spinup.play()
        this.handlers.roll.seek(15e3)
      }
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
    initSounds() {
      this.sounds = {}
      this.sounds.case = {
        tick: new Howl({
          src: [require('@/sounds/case/spinticks.webm'), require('@/sounds/case/spinticks.mp3')],
          format: ['webm', 'mp3'],
          sprite: {
            0: [0, 80],
            1: [100, 80],
            2: [200, 80],
            3: [300, 80],
            4: [400, 80],
            5: [500, 80],
            6: [600, 80],
            7: [700, 80],
            8: [800, 80],
            9: [900, 80]
          },
          volume: 0.4
        }),
        stop: new Howl({
          src: [require('@/sounds/case/stop.webm'), require('@/sounds/case/stop.mp3')],
          format: ['webm', 'mp3'],
          volume: 0.6
        }),
        pull: {
          1: new Howl({
            src: [require('@/sounds/case/pull/pull1.webm'), require('@/sounds/case/pull/pull1.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.2
          }),
          2: new Howl({
            src: [require('@/sounds/case/pull/pull2.webm'), require('@/sounds/case/pull/pull2.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.2
          }),
          3: new Howl({
            src: [require('@/sounds/case/pull/pull3.webm'), require('@/sounds/case/pull/pull3.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.2
          }),
          4: new Howl({
            src: [require('@/sounds/case/pull/pull4.webm'), require('@/sounds/case/pull/pull4.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.2
          }),
          5: new Howl({
            src: [require('@/sounds/case/pull/pull5.webm'), require('@/sounds/case/pull/pull5.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.2
          }),
          6: new Howl({
            src: [require('@/sounds/case/pull/pull6.webm'), require('@/sounds/case/pull/pull6.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.2
          })
        },
        reveal: {
          1: new Howl({
            src: [require('@/sounds/case/reveal/reveal1.webm'), require('@/sounds/case/reveal/reveal1.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.8
          }),
          2: new Howl({
            src: [require('@/sounds/case/reveal/reveal2.webm'), require('@/sounds/case/reveal/reveal2.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.8
          }),
          3: new Howl({
            src: [require('@/sounds/case/reveal/reveal3.webm'), require('@/sounds/case/reveal/reveal3.mp3')],
            format: ['webm', 'mp3'],
            volume: 0.8
          })
        },
        holo_open: new Howl({
          src: [require('@/sounds/case/holo_open.webm'), require('@/sounds/case/holo_open.mp3')],
          format: ['webm', 'mp3'],
          volume: 0.25
        }),
        holo_glitch: new Howl({
          src: [require('@/sounds/case/holo_glitch.webm'), require('@/sounds/case/holo_glitch.mp3')],
          format: ['webm', 'mp3'],
          volume: 0.6
        }),
        holo_spinup: new Howl({
          src: [require('@/sounds/case/holo_spinup.webm'), require('@/sounds/case/holo_spinup.mp3')],
          format: ['webm', 'mp3'],
          volume: 0.6
        }),
        start: new Howl({
          src: [require('@/sounds/case/start.webm'), require('@/sounds/case/start.mp3')],
          format: ['webm', 'mp3'],
          volume: 0.8
        })
      }
    },
    spaceHandler(e) {
      if (!this.replayCase || this.rolling) return

      if (e.which === 32 && (e.target.nodeName !== 'TEXTAREA' && e.target.nodeName !== 'INPUT')) {
        if (this.localSettings.spaceToOpen) {
          e.preventDefault()
          this.open()
        }
      }
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    items() {
      let items = []

      this.vcase.items
        .filter(i => !!i)
        .map((itemGroup, groupId) => {
          for (const key in itemGroup) {
            if (itemGroup.hasOwnProperty(key)) {
              itemGroup[key].caseId = this.vcase.id
              const item = parseItem(itemGroup[key])
              item.sku = groupId
              items.push(item)
            }
          }
        })

      return {
        all: sortBy(items, 'price').reverse(),
        lowest: sortBy(items, 'price')[0],
        highest: sortBy(items, 'price').reverse()[0],
        knives: sortBy(items.filter(i => i.type === 'knife'), 'price').reverse(),
        weapons: sortBy(items.filter(i => i.type !== 'knife'), 'price').reverse(),
        unique: uniqBy(items, i => i.sku)
      }
    },
    skins() {
      return sortBy(
        this.vcase.items
          .filter(i => !!i)
          .map((itemGroup, groupId) => {
            itemGroup[1].caseId = this.vcase.id
            const item = parseItem(itemGroup[1])
            item.id = groupId
            item.lowestPrice = sortBy(itemGroup, 'suggested_price')[0].suggested_price
            item.highestPrice = sortBy(itemGroup, 'suggested_price').reverse()[0].suggested_price

            return item
          }),
        'highestPrice'
      ).reverse()
    },
    skinsExpanded() {
      if (!this.skins.length) return []

      let skins = [...this.skins]
      if (this.expansionLevel * this.itemsPerExpansion > skins.length) return skins

      skins.length = this.expansionLevel * this.itemsPerExpansion

      return skins
    }
  }
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
