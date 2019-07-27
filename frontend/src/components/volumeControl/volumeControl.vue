<template>
  <v-menu class="volume-ctn" open-on-hover right offset-y attach :nudge-bottom="20" :nudge-right="$vuetify.breakpoint.width < 768 ? 0 : -120" :close-on-content-click="false" min-width="250">
    <div class="volume-icon" slot="activator" @click="toggleMute(!muted)">
      <span class="icon" :class="{muted: muted}">
        <fai fixed-width :icon="['fas', icon]" size="lg"></fai>
      </span>
    </div>
    <v-card class="px-4 py-3" color="dark ">
      {{$t('navbar.labels.volumeAll')}}
      <v-slider :disabled="muted" hide-details thumb-label class="pa-0 mb-2" v-model="value"></v-slider>
    </v-card>
  </v-menu>

</template>

<script>
import { setVolume, getVolume, setMute } from '../../sounds'

export default {
  name: 'VolumeControl',
  data() {
    return {
      value: 20,
      muted: false,
    }
  },
  watch: {
    value: function(val) {
      setVolume(val / 100)
      this.$ls.set('volMain', val / 100)
    },
  },
  methods: {
    toggleMute(val) {
      setMute(val)
      this.$ls.set('volMuted', val)
      this.muted = val
    },
  },
  mounted() {
    if (this.$ls.get('volMain') !== null) {
      this.value = this.$ls.get('volMain') * 100
    }

    if (this.$ls.get('volMuted') !== null) {
      this.toggleMute(this.$ls.get('volMuted'))
    }
  },
  computed: {
    icon() {
      if (this.muted) return 'volume-mute'
      if (this.value > 60) return 'volume-up'
      else if (this.value > 0) return 'volume-down'
      else return 'volume-off'
    },
  },
}
</script>
<style lang="scss" scoped>
@import '../../styles/variables.scss';

.volume-icon {
  .icon {
    font-size: 20px;
    color: $primary;
    transition: color 0.3s ease;

    &.muted {
      color: rgba($primary, 0.5) !important;
    }

    &:hover {
      color: $primary - 20;
    }
  }
}
</style>