/* TODO */
// get local options for display changes

// resize
import 'vue-resize/dist/vue-resize.css'
import { ResizeObserver } from 'vue-resize'

import { item } from '../../utils'

import Item from '../item'
import clamp from 'lodash-es/clamp'

export default {
  name: 'Inventory',
  props: ['items', 'loading', 'active'],
  store: ['config'],
  watch: {
    active(val) {
      if (val) {
        this.$nextTick(() => {
          this.resize()
        })
      }
    }
  },
  data() {
    return {
      itemsPerSet: 8,
      itemsPerAppend: 50,
      rowHeight: 100,
      invHeight: 500,
      appending: 0,
      rendered: 0
    }
  },
  methods: {
    renderCallback() {
      if (!this.rendered && this.items) {
        this.rendered = 1

        // first render needs to resize twice because it doesnt know sizes on first run
        this.$nextTick(() => {
          this.resize()
          this.$nextTick(() => {
            this.resize()
          })
        })
      }
    },
    resize() {
      if (!this.items || this.items.length < 1) return

      var row = Array.from(this.$el.querySelectorAll('.item-row')).filter(
        i => i.children.length === this.itemsPerSet
      )[0]
      var minItemSize = 100

      if (row) {
        var innerWidth = Array.from(row.querySelectorAll('.item'))
          .map(i => {
            let margin =
              parseInt(window.getComputedStyle(i).marginLeft) + parseInt(window.getComputedStyle(i).marginRight)
            return Math.floor(i.getBoundingClientRect().width) + margin
          })
          .reduce((acc, val) => acc + val, 0)

        // if we need to reduce items per set
        if (innerWidth > row.getBoundingClientRect().width) {
          var setNeeded = Math.floor(row.getBoundingClientRect().width / (innerWidth / this.itemsPerSet))

          this.itemsPerSet = clamp(setNeeded, 2, 13)
        }

        // if we have enough room to increase, +10 is margin
        if (row.getBoundingClientRect().width / (minItemSize + 10) > this.itemsPerSet) {
          var newFit = Math.floor(row.getBoundingClientRect().width / (minItemSize + 10))

          this.itemsPerSet = clamp(newFit, 2, 13)
        }

        this.rowHeight = row.getBoundingClientRect().height + 10
      }
    },
    append(e) {
      var leftOver = e.target.scrollHeight - e.target.offsetHeight - e.target.scrollTop
      if (leftOver < 300 && !this.appending) {
        console.log('append items')
        this.appending = 1
        // set appending var to block spam and unlock when done
      }
    }
  },
  computed: {
    itemSets() {
      let items = this.items
      if (!items.length) return []
      items = items.filter(i => !i.hidden)
      if (!items.length) return []

      var chunks = chunk(items, this.itemsPerSet)

      // prevent last row from sizing weirdly
      if (chunks[chunks.length - 1].length < this.itemsPerSet) {
        let chunk = chunks[chunks.length - 1]
        let diff = this.itemsPerSet - chunk.length
        for (let i = 0; i < diff; i++) {
          chunk.push({
            filler: true
          })
        }
      }

      return chunks
    }
  },
  components: {
    Item,
    'resize-observer': ResizeObserver
  }
}

function chunk(arr, n) {
  return arr.slice(0, ((arr.length + n - 1) / n) | 0).map((c, i) => arr.slice(n * i, n * i + n))
}
