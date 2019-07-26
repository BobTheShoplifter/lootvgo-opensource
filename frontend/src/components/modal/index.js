import Vue from 'vue'
import Modal from './modal'

import modals from '../../modals'

export { Modal }

export default {
  open(parent, type, options, payload) {
    if (!type) return
    if (!modals[type]) return console.error('[modal] modal not found')

    let propsData = {
      component: modals[type]
    }

    let defaultOptions = {
      maxWidth: 900,
      scrollable: true
    }

    options = Object.assign(defaultOptions, options)
    propsData.options = options

    if (payload) propsData.payload = payload

    const ModalComponent = Vue.extend(Modal)
    return new ModalComponent({
      el: document.createElement('div'),
      propsData,
      parent
    })
  }
}
