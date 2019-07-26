<template>

  <v-card class="modal">
    <v-card-title>Share Loot from Case #{{box.id}}</v-card-title>
    <v-card-text class="number">
      We've generated a link you can share on any social media! Just choose where you want to share it or copy the link yourself.

      <div class="social disp-flex flex-center-y flex-wrap mt-2 mb-3">
        <h3 class="fw-semibold mr-2">Share on social media:</h3>
        <v-btn @click="tweet()" color="info">
          <fai :icon="['fab','twitter']" class="mr-2 icon body-1"></fai>
          <span>Tweet</span>
        </v-btn>
        <v-btn @click="fbShare()" color="secondary">
          <fai :icon="['fab','facebook']" class="mr-2 icon body-1"></fai>
          <span>Share</span>
        </v-btn>
      </div>

      <div class="pa-3 dark mb-3">
        <div class="text-uppercase fw-semibold mb-2">Share your link!</div>
        <div class="disp-flex flex-wrap">
          <v-text-field solo-inverted class="mr-2 darker" id="shareCodeCopy" :value="url" hide-details readonly onclick="this.select()"></v-text-field>
          <v-btn class="ma-0" large color="primary" @click="copyCode()">Copy</v-btn>
        </div>
      </div>

      <div class="text-center">
        <v-btn flat small class="ma-0 caption" color="primary" :to="`/replay/${box.id}`" @click="close()">Click here to watch the replay.</v-btn>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-btn small flat @click="close()">Close</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { Errors } from '@/utils'

export default {
  store: ['actions'],
  props: ['payload', 'close'],
  data() {
    return {
      url: null,
      box: null,
    }
  },
  beforeMount() {
    this.box = this.payload

    // something went really wrong
    if (!this.box) {
      this.$toast.open({
        type: 'error',
        text: "We couldn't find the case to share, please try again.",
      })
      return this.close()
    }

    this.url = `https://casevgo.com/#/replay/${this.box.id}`
  },
  methods: {
    tweet() {
      // `https://twitter.com/intent/tweet?text=Test%20my%20asshole%0Ahttp%3A%2F%2Flocalhost%3A8080%2F%23%2Freplay%2F517199&source=webclient`
      let text = encodeURIComponent(`Look at what I just unboxed on @irlcase! #LOOTREPLAY`)
      let url = `https://twitter.com/intent/tweet?text${text}%0A${escape(this.url)}`
      window.open(url, '_blank', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600')
    },
    fbShare() {
      let text = encodeURIComponent(`Look at what I just unboxed on @irlcase! #LOOTREPLAY`)
      let url = `https://www.facebook.com/sharer/sharer.php?u=${escape(this.url)}&t=${text}`
      window.open(url, '_blank', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600')
    },
    copyCode() {
      document.getElementById('shareCodeCopy').select()
      document.execCommand('copy')

      this.$toast.open({
        text: 'Replay link copied!',
      })
    },
  },
}
</script>
