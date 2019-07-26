import groupBy from 'lodash-es/groupBy'

export default {
  name: 'NotiBell',
  props: ['data', 'align'],
  data() {
    return {
      notifications: this.data.length > 0 ? groupBy(this.data, 'category') : [],
      show: false
    }
  },
  mounted() {
    // close notifications if user clicks outside
    window.addEventListener('click', e => {
      this.show = this.$el.contains(e.target)
    })
  },
  computed: {
    count() {
      return this.data.filter(n => !n.read).length
    }
  }
}
