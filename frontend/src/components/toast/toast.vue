<template>
  <v-snackbar v-model="open" v-bind="options">
    <div class="inner mr-3">
      <div class="icon" v-if="icon">
        <fai :icon="icon"></fai>
      </div>
    </div>
    <div>
      <div class="title fw-bold mb-2" v-if="title">{{title}}</div>
      <div class="txt number fw-semibold">{{text}}</div>
    </div>
    <v-btn v-if="options.closeable" flat icon @click.native="open = false">
      <fai :icon="['fal', 'times']" size="lg"></fai>
    </v-btn>
    <v-progress-circular v-if="options.loading" class="ml-4" indeterminate color="text" :size="20"></v-progress-circular>
  </v-snackbar>
</template>

<script>
/* TODO */
import { play as playSound } from '../../sounds'

export default {
  name: 'toast',
  props: {
    title: String,
    text: String,
    type: String,
    options: Object,
  },
  data() {
    return {
      open: false,
    }
  },
  watch: {
    open: function(val) {
      if (!val) {
        this.close()
      }
    },
  },
  beforeMount() {
    document.querySelector('.app-container').appendChild(this.$el)
  },
  mounted() {
    this.open = true

    const typeSound = {
      success: 'toast_success',
      info: 'toast_info',
      error: 'toast_error',
      warning: 'toast_warning',
    }

    if (typeSound[this.type] && this.options.sound) {
      setTimeout(() => {
        playSound(typeSound[this.type], { volume: 0.3 })
      }, 300) // wait for animation
    }
  },
  methods: {
    close() {
      if (this.open) this.open = false
      setTimeout(() => {
        this.$options.onClose()
        this.$destroy()
        removeElement(this.$el)
      }, 400) // wait for animation
    },
  },
  computed: {
    icon() {
      if (!this.type) return null

      const ICONS = {
        success: ['fal', 'check'],
        info: ['far', 'info-circle'],
        warning: ['far', 'exclamation-triangle'],
        error: ['far', 'times-hexagon'],
      }

      return ICONS[this.type]
    },
  },
}

function removeElement(el) {
  if (typeof el.remove !== 'undefined') {
    el.remove()
  } else {
    el.parentNode.removeChild(el)
  }
}
</script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';
.title {
  font-family: $family-primary;
}
.snack.primary,
.snack.warning {
  .icon,
  .btn {
    color: $dark !important;
  }
}
</style>
