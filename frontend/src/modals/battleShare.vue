<template>

  <v-card class="modal">
    <v-card-title>Share Battle Link</v-card-title>
    <v-card-text class="number">
      Share this link to invite people to join your game. Anyone can also watch your battle via this link.

      <!-- <div class="social disp-flex flex-center-y flex-wrap mt-2 mb-3">
        <h3 class="fw-semibold mr-2">Share on social media:</h3>
        <v-btn @click="tweet()" color="info">
          <fai :icon="['fab','twitter']" class="mr-2 icon body-1"></fai>
          <span>Tweet</span>
        </v-btn>
        <v-btn @click="fbShare()" color="secondary">
          <fai :icon="['fab','facebook']" class="mr-2 icon body-1"></fai>
          <span>Share</span>
        </v-btn>
      </div> -->

      <div class="pa-3 dark mt-3">
        <div class="text-uppercase primary--text fw-semibold mb-2">Share your link!</div>
        <div class="disp-flex flex-wrap">
          <v-text-field solo-inverted class="mr-2 darker" id="shareCodeCopy" :value="url" hide-details readonly onclick="this.select()"></v-text-field>
          <v-btn class="ma-0" large color="primary" @click="copyCode()">Copy</v-btn>
        </div>
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
      battle: null,
    }
  },
  beforeMount() {
    this.battle = this.payload

    // something went really wrong
    if (!this.battle) return this.close()

    this.url = `${window.location.origin}/#/battle/${this.battle.id}`
  },
  methods: {
    tweet() {
      // `https://twitter.com/intent/tweet?text=Test%20my%20asshole%0Ahttp%3A%2F%2Flocalhost%3A8080%2F%23%2Freplay%2F517199&source=webclient`
      let text = encodeURIComponent(`Look at what I just unboxed on @lootvgo! #LOOTREPLAY`)
      let url = `https://twitter.com/home?status=${text}%0A${escape(this.url)}`
      window.open(url, '_blank', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600')
    },
    fbShare() {
      let text = encodeURIComponent(`Look at what I just unboxed on @lootvgo! #LOOTREPLAY`)
      let url = `https://www.facebook.com/sharer/sharer.php?u=${escape(this.url)}&t=${text}`
      window.open(url, '_blank', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600')
    },
    copyCode() {
      document.getElementById('shareCodeCopy').select()
      document.execCommand('copy')

      this.$toast.open({
        text: 'Link copied!',
      })
    },
  },
}
</script>
