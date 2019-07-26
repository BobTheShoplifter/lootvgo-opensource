import { Howl } from 'howler'
import anime from 'animejs'

import { Errors, parseItem, parseCase } from '@/utils'

import sortBy from 'lodash-es/sortBy'
import uniqBy from 'lodash-es/uniqBy'
import groupBy from 'lodash-es/groupBy'
import shuffle from 'lodash-es/shuffle'

import Inventory from '@/components/inventory'
import Item from '@/components/item'

export default {
  name: 'pageCase',
  store: ['config', 'auth', 'actions', 'state', 'localSettings'],
  data() {
    return {
      selectedCase: null,
      rolling: false,
      entries: [],
      expansionLevel: 1,
      itemsPerExpansion: 20,
      sounds: null,
      opening: {
        active: false,
        loading: false
      },
      sessionHistory: [],
      handlers: {
        roll: null,
        tickBack: null,
        special: null
      },
      autoOpen: false,
      showPrice: false,
      sellLoading: false,
      sorting: {
        current: 'dateAdded',
        descending: true,
        methods: {
          price: {
            label: 'price',
            labels: {
              desc: 'high',
              asc: 'low'
            }
          },
          dateAdded: {
            label: 'dateAdded',
            labels: {
              desc: 'new',
              asc: 'old'
            }
          }
        }
      }
    }
  },
  watch: {
    groupedCases(val) {
      if (!this.selectedCase && val.ready) {
        this.selectedCase = this.nextCase
        if (this.autoOpen) this.open()
      }
    },
    autoOpen(val) {
      if (val && this.selectedCase) {
        this.open()
      }
    }
  },
  mounted() {
    if (!this.sounds) this.initSounds()

    if (this.user) {
      this.actions.user
        .getCaseHistory()
        .then(cases => (this.state.openedCases = cases.map(i => parseCase(i))))
        .catch(err => {
          this.$toast.open({
            type: 'error',
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
    }

    if (this.nextCase) {
      this.selectedCase = this.nextCase
    }

    window.addEventListener('keydown', this.spaceHandler)
  },
  beforeMount() {
    this.checkValidity()
  },
  beforeUpdate() {
    this.checkValidity()
  },
  beforeRouteUpdate(to, from, next) {
    if (!this.$store.state.cases.find(box => box.id === parseInt(to.params.id))) {
      next('/')
    } else next()
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.spaceHandler)
  },
  methods: {
    roll(respin = false) {
      let quickOpened = false

      if (!respin) {
        if (!this.opening.active) return
        if (this.rolling) return

        this.rolling = true
      } else {
        quickOpened = !this.entries.length
        if (quickOpened) this.rolling = true
      }

      let monkaSFactor = getRandomFloat(5, 115)
      let rollLength = 90 * (120 + 5)

      if (respin) {
        if (!quickOpened) {
          monkaSFactor = getRandomFloat(5, 115)
          rollLength = 150 * (120 + 5)
          this.entries.length = 100
        }

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
        this.entries[quickOpened ? 90 : 150] = {
          url: this.selectedCase.item.url,
          color: this.selectedCase.item.color,
          price: this.selectedCase.item.price
        }
      } else {
        if (this.entries.length > 100) this.entries.length = 100
        let price = this.selectedCase.item.price

        if (this.selectedCase.item.type === 'knife' || price > 1200e2) {
          this.entries[90] = {
            special: true,
            url:
              price > 500e2
                ? price > 1200e2
                  ? '/static/img/case-rainbow.png'
                  : '/static/img/case-gold.png'
                : '/static/img/case.png',
            color: this.selectedCase.item.color
          }
        } else {
          this.entries[90] = {
            url: this.selectedCase.item.url,
            color: this.selectedCase.item.color,
            price: this.selectedCase.item.price
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

          if (!respin && (this.selectedCase.item.type === 'knife' || this.selectedCase.item.price > 1200e2)) {
            this.roll(true)
            this.showPrice = false
          } else {
            setTimeout(() => {
              this.rolling = false

              if (respin) {
                this.inspect(this.selectedCase.item)
              }

              this.processUnbox()

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
    checkValidity() {
      if (!this.$store.state.cases.find(box => box.id === parseInt(this.$route.params.id))) {
        this.$router.push('/')
      }
    },
    open(fast = false) {
      if (!this.selectedCase) return
      if (this.opening.loading || this.opening.active) return

      this.opening.loading = true

      // if user pressed quick unbox but gets a knife, don't send fast to backend
      let hasSpecial = false
      if (fast && (this.selectedCase.item.type === 'knife' || this.selectedCase.item.price > 500e2)) {
        hasSpecial = true
      }

      this.actions.user
        .openCase(this.selectedCase.internalID, hasSpecial ? false : fast)
        .then(() => {
          if (fast) {
            this.opening.active = true
            this.sounds.case.reveal[getRandomInt(1, 3)].play()

            if (hasSpecial) {
              this.roll(true)
            } else {
              this.processUnbox()
            }
          } else {
            this.opening.active = true
            this.roll()
          }
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            text:
              parseInt(err.message) === 875
                ? 'This case has already been opened.'
                : this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => {
          this.opening.loading = false
        })
    },
    processUnbox() {
      let caseInState = this.state.pendingCases.find(i => i.id === this.selectedCase.id)

      if (caseInState) this.$set(caseInState, 'opened', true)
      this.$set(this.selectedCase, 'opened', true)

      this.selectedCase.openDate = Date.now()
      this.selectedCase.status = 'opened'

      this.sessionHistory.unshift(this.selectedCase)
      this.state.openedCases.unshift(this.selectedCase)

      this.$nextTick(() => {
        this.opening.active = false

        if (this.nextCase) {
          this.selectedCase = this.nextCase
          if (this.autoOpen)
            setTimeout(() => {
              this.open()
            }, 500)
        } else this.selectedCase = null
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
    quickSell(item) {
      if (this.sellLoading) return

      this.sellLoading = true

      this.actions.user
        .sellItems([item.id])
        .then(resp => {
          this.$toast.open({
            type: 'success',
            sound: false,
            text: `Item sold successfully.`
          })

          this.$set(item, 'sold', true)

          let soldItems = this.$ls.get('soldItems') || []
          soldItems.push(item.id)
          this.$ls.set('soldItems', soldItems)
          this.actions.user.getOPBalance().then(resp => (this.user.credits = resp))
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Sell Item",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => {
          this.sellLoading = false
        })
    },
    quickSellAll() {
      if (this.sellLoading) return
      if (!this.sellAllItems.length) return

      this.sellLoading = true

      let ids = this.sellAllItems.map(i => i.item.id)

      this.actions.user
        .sellItems(ids)
        .then(resp => {
          this.$toast.open({
            type: 'success',
            sound: false,
            text: `Elligible items sold successfully.`
          })

          this.sellAllItems.forEach(i => {
            this.$set(i.item, 'sold', true)
          })

          let soldItems = this.$ls.get('soldItems') || []
          soldItems = [...soldItems, ...ids]
          this.$ls.set('soldItems', soldItems)

          this.actions.user.getOPBalance().then(resp => (this.user.credits = resp))
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Sell Item",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
          })
        })
        .finally(() => {
          this.sellLoading = false
        })
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
    applySorting(items) {
      switch (this.sorting.current) {
        case 'price':
          items = sortBy(items, i => i.item.price)
          break
        case 'dateAdded':
          items = sortBy(items, i => i.openDate || i.date)
          break
      }

      if (this.sorting.descending) items.reverse()

      return items
    },
    spaceHandler(e) {
      if (!this.selectedCase) return

      if (e.which === 32 && (e.target.nodeName !== 'TEXTAREA' && e.target.nodeName !== 'INPUT')) {
        if (this.localSettings.spaceToOpen) {
          e.preventDefault()

          if (this.rolling) this.skipAnim()
          else this.open()
        }
      }
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    vcase() {
      return this.$store.state.cases.find(box => box.id === parseInt(this.$route.params.id))
    },
    items() {
      let items = []

      this.vcase.items
        .filter(i => !!i)
        .forEach((itemGroup, groupId) => {
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
            item.lowestPrice = sortBy(itemGroup, 'suggested_price_floor')[0].suggested_price_floor
            item.highestPrice = sortBy(itemGroup, 'suggested_price_floor').reverse()[0].suggested_price_floor

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
    },
    groupedCases() {
      let cases = this.state.pendingCases.filter(i => i.caseID === this.vcase.id && i.state !== 1 && !i.opened)

      // maybe it'll work who knows
      cases = cases.filter(i => !this.sessionHistory.find(o => o.id === i.id))

      return groupBy(cases, 'status')
    },
    nextCase() {
      if (this.groupedCases.ready) {
        return this.groupedCases.ready[0]
      } else return null
    },
    openedCases() {
      let cases = this.state.openedCases.filter(i => i.caseID === this.vcase.id && i.opened)
      cases = sortBy(cases, 'date').reverse()
      if (cases.length > 30) cases.length = 30
      return cases
    },
    sessionHistorySorted() {
      return this.applySorting(this.sessionHistory)
    },
    sellAllItems() {
      return this.sessionHistory
        .filter(i => {
          if (i.item.sold) return false

          let caseDate = new Date(i.date).getTime()
          if (caseDate + 60 * 60e3 < Date.now()) return false

          return true
        })
        .map(item => ({ ...item }))
    }
  },
  components: {
    Inventory,
    Item
  }
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
