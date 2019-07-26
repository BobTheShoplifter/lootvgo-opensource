// import groupBy from 'lodash-es/groupBy'

import sidebarChat from './views/chat'
import sidebarAffiliates from './views/affiliates'

export default {
  name: 'Sidebar',
  props: ['show', 'sidebarCurrentTab'],
  store: ['auth', 'actions'],
  data() {
    return {
      currentTab: this.sidebarCurrentTab
    }
  },
  watch: {
    sidebarCurrentTab(val) {
      this.currentTab = this.sidebarCurrentTab
    },
    currentTab(val) {
      this.$emit('update:sidebarCurrentTab', val)
    }
  },
  methods: {
    close() {
      this.$emit('update:show', false)
    }
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    }
  },
  components: {
    sidebarChat,
    sidebarAffiliates
  }
}
