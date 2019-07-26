// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import moment from 'moment'

// Import theme colors from style files
import themingVariables from './styles/export.scss'

// Scroll performance lib
import VirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
Vue.use(VirtualScroller)

// FontAwesome 5 Pro
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import icons from '@/lib/icons'
library.add(...icons)
Vue.component('fai', FontAwesomeIcon)

// DEV ONLY, USE TREESHAKING ONCE DONE
// import FAIBrands from '@fortawesome/fontawesome-free-brands'
// import FAISolid from '@fortawesome/fontawesome-pro-solid'
// import FAIRegular from '@fortawesome/fontawesome-pro-regular'
// import FAILight from '@fortawesome/fontawesome-pro-light'
// fontawesome.library.add(FAIBrands, FAISolid, FAIRegular, FAILight)

// router
import VueRouter from 'vue-router'
import routes from './routes'
Vue.use(VueRouter)
const router = new VueRouter({
  routes
})

// analytics
import VueAnalytics from 'vue-analytics'
Vue.use(VueAnalytics, {
  id: 'UA-122173981-1',
  router,
  debug: {
    // enabled: process.env.NODE_ENV === 'development',
    sendHitTask: process.env.NODE_ENV === 'production'
  },
  autoTracking: {
    exception: true
  },
  ecommerce: {
    enabled: true
  }
})

// custom
import Actions from './api'
import App from './App.vue'

// A-la-carte import of Vuetify
import {
  Vuetify,
  VApp,
  VNavigationDrawer,
  VFooter,
  VList,
  VBtn,
  VIcon,
  VGrid,
  VTextField,
  VSubheader,
  VToolbar,
  VAlert,
  VJumbotron,
  VExpansionPanel,
  VForm,
  VDivider,
  VDialog,
  VCard,
  VSlider,
  VSelect,
  VSpeedDial,
  VSwitch,
  VDatePicker,
  VTooltip,
  VMenu,
  VTabs,
  VDataTable,
  VCarousel,
  VSnackbar,
  VProgressCircular,
  transitions
} from 'vuetify'
import { Ripple } from 'vuetify/es5/directives'
import './styles/vuetify.styl'
import './styles/flags.css'
import './styles/turbogg.scss'
import './styles/turbodraft.scss'
import './styles/helpers.scss'

// configure vuetify
Vue.use(Vuetify, {
  components: {
    VApp,
    VJumbotron,
    VSnackbar,
    VDivider,
    VAlert,
    VCarousel,
    VDialog,
    VDatePicker,
    VSlider,
    VNavigationDrawer,
    VForm,
    VExpansionPanel,
    VFooter,
    VList,
    VBtn,
    VDataTable,
    VSpeedDial,
    VIcon,
    VTabs,
    VSelect,
    VGrid,
    VMenu,
    VTextField,
    VSubheader,
    VTooltip,
    VToolbar,
    VSwitch,
    VCard,
    VProgressCircular,
    transitions
  },
  directives: { Ripple },
  theme: themingVariables,
  options: {
    themeVariations: ['primary', 'secondary', 'light', 'dark', 'darker']
  }
})

// Locale Storage
import VueLocalStorage from 'vue-ls'
Vue.use(VueLocalStorage, {
  namespace: 'turbogg_'
})

// Translation system
import VueI18n from 'vue-i18n'
import messages from './lang'
Vue.use(VueI18n)

let navigatorLang = window.navigator.language.split('-')[0]

const i18n = new VueI18n({
  locale: messages[navigatorLang] ? navigatorLang : 'en',
  fallbackLocale: 'en',
  messages
})

// simpliefied store system
import VueStash from 'vue-stash'
import store from './lib/store'
Vue.use(VueStash)

// custom prototypes
import Modal from './components/modal'
Vue.prototype.$modal = Modal

import Toast from './components/toast'
Vue.prototype.$toast = Toast

// custom filters
Vue.filter('currency', function(val) {
  return val.toLocaleString(i18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

Vue.filter('currencyInt', function(val) {
  return (val / 100).toLocaleString(i18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

Vue.filter('numberInt', function(val) {
  return val.toLocaleString(i18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
})

Vue.filter('formatDate', function(value) {
  return moment(value).format('MM/DD/YYYY HH:mm:ss')
})

Vue.config.productionTip = process.env.NODE_ENV === 'production'
Vue.config.devtools = process.env.NODE_ENV === 'development'
Vue.config.performance = process.env.NODE_ENV === 'development'

const initApp = _ => {
  /* eslint-disable no-new */
  return new Vue({
    el: '#app',
    router,
    i18n,
    data: {
      store
    },
    render: h => {
      return h(App)
    },
    beforeCreate() {
      // load important shit into store
      // store.config = config
      // store.auth = auth
      store.actions = Actions

      // override language from localstorage
      if (this.$ls.get('lang') !== null) {
        this.$i18n.locale = this.$ls.get('lang')
      }

      // inherit localSettings from localStorage
      if (this.$ls.get('settings') !== null) {
        store.localSettings = Object.assign(store.localSettings, this.$ls.get('settings'))
      }
    },

    // debug
    created() {
      if (document.location.origin.indexOf('localhost') !== -1) {
        window.vue = this
        document.title = 'LOCALHOST'
      }
    }
  })
}

initApp()
