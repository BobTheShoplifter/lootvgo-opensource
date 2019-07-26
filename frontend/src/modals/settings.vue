<template>
  <v-card class="modal">
    <v-card-title>{{$t(`modals.settings.title`)}}</v-card-title>
    <v-card-text>
      <h3>{{$t(`modals.settings.local.title`)}}</h3>
      <p class="primary--text subheading">{{$t(`modals.settings.local.description`)}}</p>

      <v-switch v-model="localSettings.disableAnim" hide-details color="primary" :label="$t(`modals.settings.local.disableAnim`)"></v-switch>
      <v-switch v-model="localSettings.vibrantItems" hide-details color="primary" :label="$t(`modals.settings.local.vibrantItems`)"></v-switch>

      <h3 class="mt-4 mb-2">Case Opening Settings</h3>
      <v-switch v-model="localSettings.spaceToOpen" hide-details color="primary" label="Use Space to Open Cases"></v-switch>
      <div class="input-group pt-1 slider-ctn">
        <v-slider v-model="localSettings.animationSpeed" thumb-label class="pa-0" label="Animation Speed" hide-details :min="5" :max="15" step="1"></v-slider>
        <span class="ml-3 fw-bold number">{{localSettings.animationSpeed}}s</span>
      </div>

      <h3 class="mt-4 mb-2">Battle Settings</h3>
      <v-switch v-model="localSettings.battleShortcuts" hide-details color="primary" label="Use Hotkeys &amp; Shortcuts"></v-switch>

    </v-card-text>
    <v-card-actions>
      <v-btn flat small @click="close()">{{$t(`common.close`)}}</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { Errors } from '@/utils'

export default {
  props: ['close'],
  store: ['auth', 'localSettings', 'actions'],
  data() {
    return {
      valid: false,
      tradeUrl: null,
      loading: false,
      // validation
      validation: {
        tradeURL: [
          v => !!v || this.$t('modals.settings.tradeURL.validation.required'),
          v =>
            /https?:\/\/(?:www.)?steamcommunity\.com\/tradeoffer\/new\/?\?partner=(\d+)(?:&|&amp;)token=[a-z0-9-_]{8}/i.test(
              v
            ) || this.$t('modals.settings.tradeURL.validation.invalid'),
        ],
      },
    }
  },
  mounted() {
    this.tradeUrl = this.user.tradeUrl
    this.settings = this.localSettings
  },
  methods: {
    save() {
      if (this.valid) {
        this.loading = true

        this.actions
          .setTradeUrl(this.tradeUrl)
          .then(() => {
            this.user.tradeUrl = this.tradeUrl
            this.$toast.open({
              type: 'success',
              title: this.$t(`modals.settings.toasts.save.title`),
              text: this.$t(`modals.settings.toasts.save.text`),
            })
          })
          .catch(err => {
            this.$toast.open({
              type: 'error',
              title: this.$t(`modals.settings.toasts.errors.save`),
              text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`,
            })
          })
          .finally(() => (this.loading = false))
      } else {
        this.$refs.form.validate()
      }
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

<style lang="scss" scoped>
form .btn {
  display: block;
  margin-left: auto;
}
</style>
