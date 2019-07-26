import * as utils from '@/utils'

import groupBy from 'lodash-es/groupBy'

export default {
  name: 'viewHelp',
  store: ['config', 'auth', 'actions'],
  data() {
    return {
      searchInput: '',
      tawkto: null,
      supportLive: false
    }
  },
  methods: {
    scrollTo(pos) {
      let container
      let el = this.$el.querySelector('#helpCardsScrollTo-' + pos)

      if (this.$vuetify.breakpoint.width < 768) {
        container = this.$el
      } else {
        container = this.$el.querySelector('.section.content .cards')
      }

      container.scrollTop = el.offsetTop - el.clientHeight
    }
  },
  mounted() {
    // tawk.to integration
    if (!this.tawkto) {
      window.Tawk_API = window.Tawk_API || {}
      window.Tawk_LoadStart = new Date()
      ;(function() {
        var s1 = document.createElement('script'),
          s0 = document.getElementsByTagName('script')[0]
        s1.async = true
        s1.src = 'https://embed.tawk.to/5ad601f4227d3d7edc24078c/default'
        s1.charset = 'UTF-8'
        s1.setAttribute('crossorigin', '*')
        s0.parentNode.insertBefore(s1, s0)
      })()

      window.Tawk_API.onStatusChange = val => {
        if (val === 'online') this.supportLive = true
        else this.supportLive = false
      }

      window.Tawk_API.onLoad = () => {
        this.tawkto = window.Tawk_API

        if (this.user) {
          window.Tawk_API.setAttributes({
            steamid: this.user.steamID,
            username: this.user.username,
            balance: `${this.user.balance} - $${(
              this.user.balance / 100
            ).toFixed(2)}`,
            tradeURL: this.user.tradeUrl
          })
        }
      }
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    },
    filteredQuestions() {
      return this.translatedQuestions.filter(i => {
        let query = this.searchInput.toLowerCase()
        return (
          i.question.toLowerCase().includes(query) ||
          i.answer.toLowerCase().includes(query)
        )
      })
    },
    categorizedQuestions() {
      return groupBy(this.filteredQuestions, 'category')
    },
    categories() {
      return Object.keys(groupBy(this.translatedQuestions, 'category'))
    },
    translatedQuestions() {
      let faqs = this.$i18n.messages[this.$i18n.locale].faq
      let questions = []

      for (const key in faqs) {
        if (faqs.hasOwnProperty(key)) {
          faqs[key].id = key
          if (faqs[key].answer.includes('{')) {
            faqs[key].answer = this.$t(`faq[${key}].answer`, {
              minBet: this.$options.filters.currencyInt(
                this.config.game.minBet
              ),
              limit: this.$options.filters.currencyInt(
                this.config.game.betLimits.table
              )
            })
          }

          questions.push(faqs[key])
        }
      }

      return questions
    }
  }
}
