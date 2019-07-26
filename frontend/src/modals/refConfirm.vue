<template>

  <v-card class="modal">
    <v-card-title>Please Confirm Referral</v-card-title>
    <v-card-text class="number fw-semibold tertiary--text">
      You are about to set "{{code}}" as your referral code. If you got here by mistake or didn't intend on doing this, press Cancel below.
    </v-card-text>
    <v-card-actions>
      <v-btn small @click="applyCode()" color="success">Agree</v-btn>
      <v-btn small @click="cancel()" color="danger">Cancel</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { Errors } from '@/utils'

export default {
  store: ['actions'],
  props: ['close'],
  data() {
    return {
      code: null,
    }
  },
  beforeMount() {
    this.code = window.getCookie('refCode')

    // something went really wrong
    if (!this.code) {
      this.$toast.open({
        type: 'error',
        text: "We couldn't find a code linked with your account. Try the referral url again.",
      })
    }
  },
  methods: {
    applyCode() {
      if (!this.code) return
      this.actions.ref
        .applyCode(this.code)
        .then(() => {
          this.$toast.open({
            type: 'success',
            text: `Referral linked to "${this.code}".`,
          })

          del_cookie('refCode')
          this.close()
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: "Couldn't Apply Code",
            text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`,
          })
        })
    },
    cancel() {
      del_cookie('refCode')
      this.close()
    },
  },
}

function del_cookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
}
</script>
