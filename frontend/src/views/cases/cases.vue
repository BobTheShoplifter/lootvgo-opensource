<template>
  <div class="page-content page-cases">

    <v-container grid-list-xl>

      <div class="disp-flex flex-wrap">
        <div class="game-main">
          <transition name="fade">
            <section class="section mb-3" v-if="!!state.pendingCases.filter(i => i.state !== 1).length">
              <div class="header mb-3">
                <div class="subheading mb-1 fw-bold text-uppercase primary--text disp-flex flex-center-y">
                  <v-progress-circular class="mr-2" indeterminate color="primary" size="20"></v-progress-circular>
                  Pending Cases
                </div>
                <p class="number">These are cases you have purchased that are waiting to be processed by the
                  blockchain. Once processed, you'll have the option to open them. </p>
              </div>
              <div class="cases disp-flex flex-wrap flex-no-shrink">

                <v-card class="case mx-2 pa-3 flex-no-shrink ready" v-for="vcase in cases.ready" :key="vcase[0].id">
                  <div class="amount absolute fw-bold tertiary--text headline number">{{vcase.length}}x</div>

                  <div class="fw-semibold text-center">{{state.cases.find(i => i.id === vcase[0].caseID).name}}</div>
                  <img :src="state.cases.find(i => i.id === vcase[0].caseID).url" alt="case">

                  <v-btn round color="tertiary dark--text" :to="`/case/${vcase[0].caseID}`">
                    <fai :icon="['fas', 'gift']" class="mr-2"></fai>
                    Unbox Loot
                  </v-btn>
                </v-card>

                <v-card class="case mx-2 pa-3 flex-no-shrink" v-for="vcase in cases.pending" :key="vcase[0].id">
                  <div class="amount absolute fw-bold tertiary--text headline number">{{vcase.length}}x</div>

                  <div class="fw-semibold text-center">{{state.cases.find(i => i.id === vcase[0].caseID).name}}</div>
                  <img :src="state.cases.find(i => i.id === vcase[0].caseID).url" alt="case">

                  <v-btn round color="tertiary dark--text" disabled>
                    <div class="disp-flex flex-align-y">
                      <v-progress-circular class="mr-2" indeterminate color="dark" size="20"></v-progress-circular>
                      Processing...
                    </div>
                  </v-btn>
                </v-card>

              </div>
            </section>
          </transition>

          <div class="title mb-3 fw-bold text-uppercase primary--text">vIRL Cases</div>

          <div class="cases cases-buy disp-flex flex-wrap flex-no-shrink mb-4">
            <v-card class="case ma-2 pa-3 flex-no-shrink" v-for="vcase in state.cases.filter(i => i.id > 1000)" :key="vcase.id">
              <div class="fw-semibold text-center">{{vcase.name}}</div>
              <div class="fw-bold caption absolute number danger--text text-uppercase remaining" v-show="vcase.remaining < 800 && vcase.remaining > 0">Only
                {{vcase.remaining | numberInt}} left</div>
              <img :src="vcase.url" alt="case" @click="$router.push(`/case/${vcase.id}`)">
              <fai :icon="['far', 'info-circle']" class="icon display-3 absolute mr-2"></fai>

              <v-btn :disabled="vcase.remaining < 1" round color="primary" @click="$modal.open($root, 'buyCase', {maxWidth: 400, persistent: true}, vcase)">
                <fai :icon="['fas', 'shopping-cart']" class="mr-2"></fai>
                Purchase Case
              </v-btn>
            </v-card>
          </div>

          <div class="title mb-3 fw-bold text-uppercase primary--text">VGO Cases</div>

          <div class="cases cases-buy disp-flex flex-wrap flex-no-shrink mb-4">
            <v-card class="case ma-2 pa-3 flex-no-shrink" v-for="vcase in state.cases.filter(i => i.id < 1000)" :key="vcase.id">
              <div class="fw-semibold text-center">{{vcase.name}}</div>
              <div class="fw-bold caption absolute number danger--text text-uppercase remaining" v-show="vcase.remaining < 800 && vcase.remaining > 0">Only
                {{vcase.remaining | numberInt}} left</div>
              <img :src="vcase.url" alt="case" @click="$router.push(`/case/${vcase.id}`)">
              <fai :icon="['far', 'info-circle']" class="icon display-3 absolute mr-2"></fai>

              <v-btn :disabled="vcase.remaining < 1" round color="primary" @click="$modal.open($root, 'buyCase', {maxWidth: 400, persistent: true}, vcase)">
                <fai :icon="['fas', 'shopping-cart']" class="mr-2"></fai>
                Purchase Case
              </v-btn>
            </v-card>
          </div>

        </div>

        <div class="game-sidebar">
          <h1 class="fw-bold mb-1 tertiary--text">Case Stats</h1>
          <v-card class="dark elevation-8 mb-3">
            <div class="stats pa-3 text-uppercase caption fw-semibold">
              <div class="fw-bold tertiary--text">Today</div>
              <div class="stat disp-flex flex-between" v-if="stats.day">
                <span class="text-faded-5">Cases Opened</span>
                <span class="number text-uppercase">{{stats.day.amount | numberInt}}</span>
              </div>
              <div class="stat disp-flex flex-between mb-2" v-if="stats.day">
                <span class="text-faded-5">Total Won</span>
                <span class="number text-uppercase">${{stats.day.value | currencyInt}}</span>
              </div>
              <div class="fw-bold tertiary--text">All Time</div>
              <div class="stat disp-flex flex-between" v-if="stats.all">
                <span class="text-faded-5">Cases Opened</span>
                <span class="number text-uppercase">{{stats.all.amount | numberInt}}</span>
              </div>
              <div class="stat disp-flex flex-between" v-if="stats.all">
                <span class="text-faded-5">Total Won</span>
                <span class="number text-uppercase">${{stats.all.value | currencyInt}}</span>
              </div>
            </div>
          </v-card>

          <div class="dark disp-flex flex-center-y key-count mb-3" v-if="user">
            <span class="relative mx-3 number body-2 mb-1 flex-grow">
              <fai :icon="['fas', 'key']" class="icon caption key-icon mr-2 primary--text text-faded-5" size="sm"></fai>
              <fai :icon="['fas', 'sync-alt']" class="icon caption refresh-btn absolute secondary--text" size="sm" @click="refreshKeys()" :spin="loadingKeys"></fai>
              <span class="fw-semibold number">{{user.keys}}</span>
              <span class="text-uppercase fw-semibold ml-1">Keys</span>
            </span>
            <v-btn class="ml-0 val" small color="primary" @click="$modal.open($root, 'buyKeys', {maxWidth: 450})">
              <fai :icon="['fas', 'plus']" class="mx-1 icon caption"></fai>
              <span class="mx-1 text-uppercase fw-bold caption">Buy More vKeys</span>
            </v-btn>
          </div>

          <v-card class="darker mb-3 px-3 py-2">
            <h3 class="fw-bold mb-1 quaternary--text">How does it work?</h3>
            <p>Unboxing cases is easy. Link your Steam or Facebook account with your WAX All-Access account, activate 2fa, load your
              WAX account balance and you're set.</p>
            <p>You can purchase cases on this page directly or click the case to see whats inside along with a lot of
              useful info.</p>
          </v-card>

          <!-- <h3 class="fw-bold mb-1 tertiary--text">All-Time Best Loot</h3>
          <v-card class="pa-3 mb-3 dark"></v-card>

          <h3 class="fw-bold mb-1 tertiary--text">Some other stat</h3>
          <v-card class="pa-3 dark"></v-card> -->

        </div>

        <v-flex md12>
          <div v-if="!!topUnboxesSorted.length">
            <div class="title mb-3 fw-bold text-uppercase primary--text">
              Top
              <span class="number">{{topUnboxesSorted.length}}</span>
              Unboxes Today
            </div>

            <transition-group name="scale" class="items-showcase disp-flex flex-wrap">
              <v-card class="item mx-2 mb-3 dark disp-flex flex-column flex-no-shrink" :class="{ vibrant:localSettings.vibrantItems, knife: box.item.type === 'knife' }" v-for="box in topUnboxesSorted" :key="box.id">
                <figure class="disp-flex flex-center pa-3" :rarity="box.item.color" :style="{borderColor: box.item.color}">
                  <div class="price absolute caption fw-semibold tertiary--text number">${{box.item.price |
                    currencyInt}}</div>
                  <img :src="box.item.url" alt="item" class="item-img">
                  <div class="odds absolute caption fw-bold text-uppercase primary--text number">{{box.item.wearShort}}</div>
                </figure>
                <v-card-text class="text-center flex-column">
                  <div class="fw-semibold">{{box.item.skin || box.item.name}}</div>
                  <div class="fw-bold caption text-faded-5 text-uppercase mb-3" :style="{color:box.item.color}">{{box.item.category}}</div>

                  <a class="meta user disp-flex flex-center mb-3" :href="'https://steamcommunity.com/profiles/'+box.user.steamID" target="_blank">
                    <div class="ml-2 disp-flex flex-center-y">
                      <img class="mr-2" :src="box.user.avatarUrl" alt="user icon">
                      <div class="number username text--text caption">{{box.user.username}}</div>
                    </div>
                  </a>

                  <v-btn flat small :style="{color: box.item.color}" class="ma-0" :to="`/replay/${box.caseID}`">
                    <span class="mx-2">
                      <fai :icon="['fas', 'undo']" class="mr-2"></fai>
                      Replay
                    </span>
                  </v-btn>
                </v-card-text>
              </v-card>
            </transition-group>
          </div>
        </v-flex>
      </div>

    </v-container>

  </div>
</template>

<style lang="scss" src="./cases.scss" scoped></style>

<script>
import groupBy from 'lodash-es/groupBy'
import sortBy from 'lodash-es/sortBy'

import { Errors, parseItem } from '@/utils'

export default {
  name: 'pageCases',
  store: ['config', 'auth', 'actions', 'state', 'localSettings'],
  data() {
    return {
      stats: {},
      topUnboxes: [],
      loadingKeys: false
    }
  },
  watch: {
    'state.recentWinners': {
      handler(val) {
        let box = val[0]
        if (!box) return

        if (box.battle) return

        // update stats

        if (this.stats.all) {
          this.stats.all.amount++
          this.stats.all.value += box.item.price
        }

        if (this.stats.day) {
          this.stats.day.amount++
          this.stats.day.value += box.item.price
        }

        let lowestPriceItem = sortBy(this.topUnboxes, i => i.item.price)[0]
        if (this.topUnboxes.length > 20 && lowestPriceItem && lowestPriceItem.price > box.item.price) return

        this.topUnboxes.push(box)
      },
      deep: true
    }
  },
  mounted() {
    this.actions.stats
      .getStats()
      .then(resp => {
        this.stats = {
          day: {
            amount: resp.amountDay,
            value: resp.valueDay
          },
          all: {
            amount: resp.amountAll,
            value: resp.valueAll
          }
        }

        if (resp.topDay) {
          resp.topDay.forEach(i => {
            i.case.item.caseId = i.case.schemaID
            i.case.item = parseItem(i.case.item)

            let data = i.case
            data.user = i.user

            this.topUnboxes.push(data)
          })
        }
      })
      .catch(err => {
        this.$toast.open({
          type: 'error',
          text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
        })
      })
  },
  methods: {
    refreshKeys() {
      if (this.loadingKeys) return
      this.loadingKeys = true

      this.actions.user
        .getKeyCount()
        .then(count => (this.user.keys = count))
        .catch(err => console.error(this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`))
        .finally(() => {
          this.loadingKeys = false
        })
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    cases() {
      return {
        ready: groupBy(this.state.pendingCases.filter(i => i.status === 'ready'), 'caseID'),
        pending: groupBy(this.state.pendingCases.filter(i => i.status === 'pending' && i.state !== 1), 'caseID')
      }
    },
    topUnboxesSorted() {
      let boxes = sortBy(this.topUnboxes, i => i.item.price).reverse()
      if (boxes.length > 20) boxes.length = 20

      return boxes
    }
  }
}
</script>
