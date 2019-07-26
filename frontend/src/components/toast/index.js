import Vue from 'vue'
import Toast from './toast'

let currentToast = null

export { Toast }
export default {
  open(params) {
    if (!params.text) return console.error('[toast] no text supplied')
    if (!params.type) params.type = 'info'

    let propsData = {
      title: params.title,
      text: params.text,
      type: params.type
    }

    let defaultOptions = {
      color: params.type || 'info',
      closeable: true,
      autoHeight: true,
      timeout: 6000,
      sound: true,
      multiLine: !!params.title || params.text.length > 80
    }

    propsData.options = Object.assign(defaultOptions, params)

    // close()
    currentToast = spawn(propsData)
  }
}

function spawn(propsData) {
  if (currentToast) {
    currentToast.close()
  }

  const ToastComponent = Vue.extend(Toast)
  return new ToastComponent({
    el: document.createElement('div'),
    propsData,
    onClose: function() {
      currentToast = false
    }
  })
}

export function close() {
  if (currentToast) currentToast.close()
}

const ID = function() {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return (
    '_' +
    Math.random()
      .toString(36)
      .substr(2, 9)
  )
}
