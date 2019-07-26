<template>
  <transition name="scaleIn" v-if="loading">
    <div class="disp-flex pa-5 flex-column flex-center">
      <v-progress-circular class="mb-3" indeterminate color="primary" size="50"></v-progress-circular>
      <span class="text-uppercase fw-bold">Loading</span>
    </div>
  </transition>
  <transition name="scale" v-else>
    <v-container>
      inventory

    </v-container>
  </transition>

</template>

<script>
import { Errors } from '@/utils'
import CountTo from 'vue-count-to'

export default {
  name: 'UserInventory',
  store: ['auth', 'actions', 'state'],
  data() {
    return {
      loading: false,
    }
  },
  beforeMount() {
    // loading
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
  },
  components: {
    CountTo,
  },
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
