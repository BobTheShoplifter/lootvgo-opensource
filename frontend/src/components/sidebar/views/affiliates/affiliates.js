export default {
  name: 'sidebarViewAffiliates',
  store: ['auth'],
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    }
  }
}
