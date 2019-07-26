<template>
  <v-dialog v-model="open" v-bind="options">
    <component :is="component" :payload="payload" :close="close"></component>
  </v-dialog>
</template>

<script>
/* TODO */

export default {
  name: 'modalContainer',
  props: {
    component: [Object, Function],
    programmatic: Boolean,
    options: Object,
    payload: Object,
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
    document.querySelector('#app').appendChild(this.$el)
  },
  mounted() {
    this.open = true
  },
  methods: {
    close() {
      if (this.open) this.open = false
      setTimeout(() => {
        this.$destroy()
        removeElement(this.$el)
      }, 300)
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

<style lang="scss">
@import '../../styles/variables.scss';

figure {
  margin: 0 auto 1em auto;
  text-align: center;
}

.card.modal {
  border-radius: 8px;
  overflow: hidden;

  > .card__title,
  > .card__actions {
    box-shadow: 0 0 12px rgba(black, 0.8);
    background: $dark;
    padding: 15px;
    font-size: 20px;
    z-index: 1;
    position: relative;
  }

  > .card__text {
    background: $darker;
    padding: 20px;
    overflow-y: auto;
  }

  > .card__actions {
    display: flex;
    justify-content: flex-end;
    padding: 15px;

    .btn {
      margin: 0 10px;

      &:last-child {
        margin-right: 0;
      }
    }
  }
}
</style>
