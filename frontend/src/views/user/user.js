import { Errors } from '@/utils'

export default {
  name: 'pageUser',
  store: ['config', 'auth', 'actions', 'state', 'localSettings'],
  data() {
    return {
      loading: false,
      me: null,
      stats: null,
      history: null
    }
  },
  mounted() {},
  beforeMount() {
    this.checkValidity(this.$route.params.id)
  },
  beforeRouteUpdate(to, from, next) {
    this.checkValidity(to.params.id, next)
  },
  methods: {
    checkValidity(id, cb) {
      if (id === 'me') {
        if (this.user) {
          this.me = true
          this.stats = this.user.stats
          this.history = this.state.openedCases
          if (cb) cb()
        } else window.location.replace('/auth')
      } else {
        if (cb) cb('/')
        else this.$router.push('/')

        // call backendo
      }
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    props() {
      return {
        stats: this.stats,
        history: this.history
      }
    }
  }
}
