<template>
  <v-card class="modal">
    <div class="item-float my-5 py-4">
      <transition name="fade">
        <div class="loading text-center mt-3" v-show="imgLoading">
          <v-progress-circular indeterminate large color="primary"></v-progress-circular>
        </div>
      </transition>
      <div class="item-img text-center">
        <img :class="{loaded: !imgLoading}" ref="img" :src="item.url" alt="item image" class="item">
      </div>
      <div class="item-info fw-bold text-center">
        <div class="price display-1 fw-bold number tertiary--text mb-2">${{item.price | currencyInt}}</div>
        <div v-if="item.weapon && item.skin" class="name number mb-1">{{item.weapon}} | {{item.skin}}</div>
        <div v-else class="name number mb-1">{{item.name}}</div>
        <span v-if="item.wear" class="caption fw-bold text-uppercase secondary--text py-1 px-2">{{item.wear}}</span>
      </div>
    </div>
    <v-card-text>
      <div class="content d-block">
        <v-layout row wrap class="text-center text-uppercase special">
          <v-flex class="mb-3" xs6 v-if="item.rarity">
            <div class="value fw-semibold" :style="{color: item.color}">{{item.rarity}}</div>
            <div class="label fw-bold">{{$t(`modals.inspect.rarity`)}}</div>
          </v-flex>
          <v-flex class="mb-3 text-uppercase" xs6 v-if="item.type">
            <div class="value primary--text fw-semibold">{{item.type}}</div>
            <div class="label fw-bold">{{$t(`modals.inspect.type`)}}</div>
          </v-flex>
        </v-layout>
        <div class="inspect text-center mb-2" v-if="item.inspect_urls">
          <v-btn flat small :href="item.inspect_urls.front_image" target="_blank">
            <fai :icon="['fas', 'eye']" class="icon caption primary--text mr-2"></fai>
            Front Side
          </v-btn>
          <v-btn flat small :href="item.inspect_urls.back_image" target="_blank">
            <fai :icon="['fas', 'eye']" class="icon caption primary--text mr-2"></fai>
            Back Side
          </v-btn>
          <video loop autoplay muted class="mb-1">
            <source :src="item.inspect_urls.video" type="video/webm">
            <v-btn flat small :href="item.inspect_urls.video" target="_blank">
              <fai :icon="['fas', 'play']" class="icon caption primary--text mr-2"></fai>
              Video Inspect
            </v-btn>
          </video>

        </div>
        <div class="float mt-4" v-if="item.float">
          <div class="float-info number text-faded-5 disp-flex flex-between">
            <span class="wear primary--text">{{item.wearShort}}</span>
            <span class="condition tertiary--text">{{item.float.toFixed(8)}}</span>
          </div>
          <div class="arrow"></div>

          <div class="float-bar">
            <div class="bar fn"></div>
            <div class="bar mw"></div>
            <div class="bar ft"></div>
            <div class="bar ww"></div>
            <div class="bar bs"></div>
          </div>

        </div>
      </div>

    </v-card-text>
    <v-card-actions>
      <v-btn flat small @click="close">{{$t(`common.close`)}}</v-btn>
      <v-btn round small color="primary" class="mx-0" :href="`https://opskins.com/?loc=shop_search&app=1912_1&search_item=${item.name}&sort=lh`" target="_blank">
        <span class="mx-2">
          <fai :icon="['fas', 'external-link']" class="icon body-1 mr-2"></fai>Buy on WAX
        </span>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
// TODO: add favourite button

import anime from 'animejs'

export default {
  name: 'ModalInspect',
  props: ['payload', 'close'],
  data() {
    return {
      item: this.payload,
      imgSize: '250fx250f', // highest: 512f
      imgLoading: true
    }
  },
  beforeMount() {
    this.imgLoading = !this.isCached(this.item.urlLarge)
  },
  mounted() {
    this.$ga.event('item', 'inspect', this.item.name, 1)

    this.$el.parentNode.style.overflow = 'visible'

    var modal = this.$el

    var timeline = anime.timeline({
      autoplay: false
    })

    timeline
      .add({
        targets: modal.querySelectorAll('.item-info > *'),
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        offset: 100,
        elasticity: 0,
        delay: function(el, i, l) {
          return i * 200
        },
        easing: 'easeInOutQuad'
      })
      .add({
        targets: modal.querySelectorAll('.content .float-bar'),
        duration: 500,
        offset: 200,
        elasticity: 0,
        translateY: [10, 0]
      })
      .add({
        targets: modal.querySelectorAll('.content .float .arrow'),
        duration: 500,
        elasticity: 300,
        offset: '-=700',
        left: [-20, this.item.float * 100 + '%']
      })
      .add({
        targets: modal.querySelectorAll('.content .float-info .wear'),
        duration: 500,
        elasticity: 300,
        offset: 500,
        opacity: [0, 1],
        translateX: [-30, 0],
        easing: 'easeInOutQuint'
      })
      .add({
        targets: modal.querySelectorAll('.content .float-info .condition'),
        duration: 500,
        elasticity: 300,
        offset: 500,
        opacity: [0, 1],
        translateX: [30, 0],
        easing: 'easeInOutQuint'
      })
      .add({
        targets: modal.querySelectorAll('.content .special .label'),
        duration: 300,
        elasticity: 0,
        offset: '-=400',
        opacity: [0, 0.5],
        translateY: [20, 0],
        easing: 'easeOutExpo'
      })
      .add({
        targets: modal.querySelectorAll('.content .special .value'),
        duration: 300,
        elasticity: 0,
        offset: '-=200',
        opacity: [0, 1],
        translateY: [20, 0],
        easing: 'easeOutExpo'
      })
      .add({
        targets: modal.querySelectorAll('.content .inspect video'),
        duration: 300,
        elasticity: 300,
        offset: '-=200',
        opacity: [0, 1],
        scale: [1.5, 1],
        easing: 'easeOutExpo'
      })
      .add({
        targets: modal.querySelectorAll('.content .inspect .btn'),
        duration: 300,
        elasticity: 300,
        offset: '-=200',
        opacity: [0, 1],
        translateY: [30, 0],
        delay: function(el, i, l) {
          return i * 200
        },
        easing: 'easeInOutBack'
      })

    timeline.finished.then(() => {
      if (this.item.inspect_urls && this.item.inspect_urls.video) {
        this.$el.querySelector('video').play()
      }
    })

    if (this.imgLoading) {
      if (this.$ls.get('settings') !== null && this.$ls.get('settings').disableAnim) {
        timeline.seek(8000)
      } else timeline.play()
    } else timeline.seek(8000)

    timeline.play()

    this.$refs.img.onload = () => {
      this.imgLoading = false
    }
  },
  methods: {
    isCached(url) {
      var image = new Image()
      image.src = url

      return image.complete
    }
  }
}
</script>

<style src="./inspect.scss" lang="scss" scoped></style>
