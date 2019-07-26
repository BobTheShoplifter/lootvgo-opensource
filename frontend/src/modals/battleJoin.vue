<template>

  <v-card class="modal">
    <v-card-title>
      Are you sure?
      <v-spacer></v-spacer>
      <div class="dark caption body-2 disp-flex flex-center-y key-count" v-if="user">
        <fai :icon="['fas', 'key']" class="icon caption key-icon mr-2 primary--text text-faded-5" size="sm"></fai>
        <span class="fw-semibold number" :class="{'danger--text fw-bold': user && user.keyCount < payload.totalKeyCost}">{{user.keyCount}}</span>
        <span class="text-uppercase fw-semibold ml-1" :class="{'danger--text fw-bold': user && user.keyCount < payload.cases.length}">Battle Keys</span>
        <v-btn class="ma-0 ml-1 val" small flat color="primary" @click="$modal.open($root, 'battleDeposit', {maxWidth: 400, persistent: true})">
          <fai :icon="['fas', 'plus']" class="icon caption"></fai>
        </v-btn>
      </div>
    </v-card-title>
    <v-card-text class="number fw-semibold">
      You are about to join a battle. This will use {{payload.totalKeyCost}} of your battle keys.
    </v-card-text>
    <v-card-actions>
      <v-btn small flat @click="close()">Close</v-btn>

      <v-btn small round href="/auth" v-if="!user" color="primary">Login</v-btn>
      <v-btn small round @click="join()" v-else :disabled="user.keyCount < payload.totalKeyCost" :loading="loading" color="primary">Join</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { Errors } from '@/utils'

export default {
  store: ['actions', 'auth'],
  props: ['payload', 'close'],
  data() {
    return {
      loading: false,
      id: this.payload.id,
    }
  },
  methods: {
    join() {
      if (this.loading) return
      if (this.user.keyCount < this.payload.totalKeyCost) return

      this.loading = true

      this.actions.battle
        .join(this.id)
        .then(() => {
          this.user.keyCount -= this.payload.totalKeyCost
          if(this.$route.path !== '/battle/' + this.id) {
            this.$router.push('/battle/' + this.id)
          }
          this.close()
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Join Battle",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`,
          })
        })
        .finally(() => (this.loading = false))
    },
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
  },
}
</script>
