<template>
  <transition name="scaleIn" v-if="loading">
    <div class="disp-flex pa-5 flex-column flex-center">
      <v-progress-circular class="mb-3" indeterminate color="primary" size="50"></v-progress-circular>
      <span class="text-uppercase fw-bold">Loading</span>
    </div>
  </transition>
  <transition name="scale" v-else>
    <v-container>
      <div class="stats disp-flex flex-wrap flex-center my-4" v-if="totals">
        <div class="text-uppercase text-center mx-5 mb-4">
          <div class="number display-1 fw-semibold mb-2">
            <countTo :startVal="0" :endVal="totals.opened" :duration="1500"></countTo>
          </div>
          <div class="fw-bold secondary--text">Total Cases Opened</div>
        </div>
        <div class="text-uppercase text-center mx-5 mb-4">
          <div class="number display-1 fw-semibold mb-2">
            <countTo :startVal="0" :endVal="totals.won / 100" prefix="$" :decimals="2" :duration="1500"></countTo>
          </div>
          <div class="fw-bold secondary--text">Total Won</div>
        </div>
        <div class="text-uppercase text-center mx-5 mb-4">
          <div class="number display-1 fw-semibold mb-2" :class="totals.won - totals.spent < 0 ? 'danger--text' : 'success--text'">
            <countTo :startVal="0" :endVal="(totals.won - totals.spent) / 100" prefix="$" :decimals="2" :duration="1500"></countTo>
          </div>
          <div class="fw-bold secondary--text">Total Profit</div>
        </div>
      </div>

      <div class="case-stats flex-wrap disp-flex flex-around flex-center-y">
        <div class="disp-flex flex-center-y mx-2" v-for="(box, i) in stats" :key="i">
          <img :src="cases[i].url" class="mr-2" alt="case icon">
          <div class="meta number fw-bold primary--text ">
            <div class="title text--text mb-2">{{cases[i].name}}</div>
            <div class="mb-1 text-uppercase">
              <span>{{box.openCount}} Opened</span> ·
              <span>${{box.openSum | currencyInt}} Won</span>
            </div>
            <div class="mb-1 text-uppercase secondary--text">${{box.openSum - (box.openCount * (cases[i].keysPerCase * 250)) | currencyInt}} Profit</div>
          </div>
        </div>
      </div>

    </v-container>
  </transition>

</template>

<script>
import { Errors } from '@/utils'
import CountTo from 'vue-count-to'

export default {
  name: 'UserStats',
  store: ['auth', 'actions', 'state'],
  props: ['stats'],
  data() {
    return {
      loading: false
    }
  },
  watch: {
    stats: function(val) {
      if (val) {
        this.loading = false
      }
    }
  },
  beforeMount() {
    if (!this.stats) this.loading = true
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
    totals() {
      if (!this.stats) return null

      let spent = 0
      for (const key in this.stats) {
        if (this.stats.hasOwnProperty(key)) {
          let box = this.cases[key]
          spent += this.stats[key].openCount * (box.keysPerCase * 250)
        }
      }

      return {
        opened: Object.values(this.stats).reduce((acc, i) => acc + i.openCount, 0),
        won: Object.values(this.stats).reduce((acc, i) => acc + i.openSum, 0),
        spent
      }
    }
  },
  components: {
    CountTo
  }
}
</script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';

.case-stats {
  img {
    max-width: 200px;
    width: 100%;
  }
}
</style>
