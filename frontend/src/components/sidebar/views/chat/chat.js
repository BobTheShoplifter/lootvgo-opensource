import socket from '@/lib/socket'
import anime from 'animejs'
import linkifyElement from 'linkifyjs/element'

import uniqBy from 'lodash-es/uniqBy'

import { Picker, Emoji } from 'emoji-mart-vue'
import twemoji from 'twemoji'

import { Errors } from '@/utils'

import { play as playSound } from '@/sounds'

// TODO: autocomplete system for :emotes:

const USER_RANKS = {
  0: null,
  1: 'admin',
  2: 'mod',
  3: 'verified'
}

export default {
  name: 'SidebarChat',
  store: ['auth', 'actions', 'state'],
  data() {
    return {
      onlineUsers: 0,
      onlineMentions: [],
      input: '',
      rulesRead: false,
      rulesOpen: false,
      currentRoom: 'en',
      rooms: {
        en: []
      },
      sending: false,
      autocomplete: {
        active: false,
        list: []
      },
      pickerOptions: {
        set: 'twitter',
        skin: 1,
        showPreview: false,
        emojiTooltip: true
      },
      textarea: null,
      userActions: {
        show: false,
        x: 0,
        y: 0,
        user: null
      },
      modMenu: {
        chatBanned: false,
        chatMuted: false
      }
    }
  },
  watch: {
    rulesRead(val) {
      this.$ls.set('chatRulesRead', val)
    },
    input(val) {
      let mentionRegex = /@[a-zA-Z0-9_.]+?(?![a-zA-Z0-9_.])/
      let mention = val.match(mentionRegex) ? val.match(mentionRegex)[0] : null

      if (mention) {
        let mentionPos = val.indexOf(mention)
        let lastChar = val[mentionPos + mention.length]

        if (lastChar !== ' ') {
          let filteredUsers = this.onlineMentions.filter(i => {
            return i.username.toLowerCase().includes(mention.replace('@', '').toLowerCase())
          })

          if (!!filteredUsers.length) {
            this.autocomplete.active = true
            if (filteredUsers.length > 5) filteredUsers.length = 5

            filteredUsers.forEach((user, i) => {
              if (!i) user.selected = true
              else user.selected = false
            })

            this.autocomplete.list = filteredUsers
          } else {
            this.autocomplete.active = false
          }
        } else {
          this.autocomplete.active = false
        }
      } else {
        this.autocomplete.active = false
      }
    }
    // 'state.recentWinners': {
    //   handler: function(boxes) {
    //     let box = boxes[0]
    //     // if(box.item.price > 500e2 || box.item.type === 'knife') {
    //     let msg = {
    //       announcement: false,
    //       date: new Date().toLocaleTimeString(navigator.language, {
    //         hour12: false,
    //         hour: '2-digit',
    //         minute: '2-digit'
    //       }),
    //       id: box.id,
    //       message: `${box.user.username} just unboxed a ${box.item.name} worth $${this.$options.filters.currencyInt(
    //         box.item.price
    //       )}!`,
    //       user: {
    //         rank: 4,
    //         username: 'LOOT ALERT',
    //         avatarUrl: '/static/img/case-rainbow.png'
    //       }
    //     }

    //     this.rooms.en.push(msg)
    //     this.scrollToBottom()
    //     // }
    //   },
    //   deep: true
    // }
  },
  methods: {
    send(msg = this.input) {
      if (!this.user || this.sending) return
      if (!msg.replace(/\s/g, '').length) return
      this.sending = true
      this.actions.chat
        .send(msg)
        .then(() => {
          this.$ga.event('chat', 'message_sent', this.user.steamID, 1)
          this.input = ''
          playSound('chat_send', { volume: 0.3 })
        })
        .catch(err => {
          this.$toast.open({
            type: 'error',
            title: this.$t(`sidebar.chat.toasts.errors.send`),
            text:
              this.$t(`errors.${Errors[err.err.message]}`, {
                time: err.timeout
              }) + ` (${err.err.message})`
          })
        })
        .finally(() => (this.sending = false))
    },
    keypressHandler(e) {
      if (this.autocomplete.active) {
        if (e.which === 9 || e.which === 13) {
          e.preventDefault()

          if (this.autocomplete.list.find(i => i.selected)) {
            this.replaceMention(`@${this.autocomplete.list.find(i => i.selected).steamID}`)
          }
        }
      }
    },
    replaceMention(text) {
      let mentionRegex = /@[a-zA-Z0-9_.]+?(?![a-zA-Z0-9_.])/
      let mention = this.input.match(mentionRegex) ? this.input.match(mentionRegex)[0] : null

      this.input = this.input.replace(mention, text + ' ')
      this.$el.querySelector('.input-group textarea').focus()
    },
    scrollToBottom() {
      this.$nextTick(() => {
        let messagesDiv = this.$el.querySelector('.messages')
        if (!messagesDiv.querySelector(':hover')) {
          anime({
            targets: messagesDiv,
            scrollTop: [messagesDiv.scrollTop, messagesDiv.scrollHeight],
            duration: 300,
            easing: 'easeInCirc'
          })
        }
      })
    },
    insertEmoji(emoji) {
      let e = this.$el.querySelector('.input-group textarea')
      this.input =
        this.input.substring(0, e.selectionStart) +
        emoji.native +
        this.input.substring(e.selectionEnd, this.input.length)
    },
    parseMessage(el) {
      if (!el) return
      twemoji.parse(el)

      Array.from(el.querySelectorAll('.msg-text')).forEach(i => {
        linkifyElement(i, {
          target: '_blank'
        })
      })
    },
    processMessage(msg) {
      msg.timestamp = new Date(msg.date).toLocaleTimeString(navigator.language, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })

      // if mentioned mentioned
      if (this.user) {
        if (msg.message.includes('@' + this.user.steamID)) {
          msg.mentioned = true
        }
      }

      // after ping, attempt converting all mentions back to names
      let nameList = {}
      this.onlineMentions.forEach(user => {
        nameList['@' + user.steamID] = '@' + user.username
      })

      let pings = msg.message.match(/@[a-zA-Z0-9_.]+?(?![a-zA-Z0-9_.])/g)
      if (pings && !!pings.length) {
        pings.forEach(ping => {
          if (nameList[ping]) {
            msg.message = msg.message.replace(ping, nameList[ping])
          }
        })
      }

      if (msg.user) {
        msg.user.chatRank = USER_RANKS[msg.user.rank]
      }

      return msg
    },
    userActionsMenu(user) {
      this.userActions.show = false
      this.userActions.user = user
      this.$nextTick(() => {
        this.userActions.show = true
      })
    },
    getMouseCoords(e) {
      this.userActions.x = e.clientX
      this.userActions.y = e.clientY
    }
  },
  mounted() {
    // get rooms and merge into this.rooms
    this.actions.chat
      .get()
      .then(resp => {
        resp.forEach(msg => this.processMessage(msg))
        this.rooms.en = resp.reverse()

        // only on first load
        setTimeout(() => {
          this.scrollToBottom()
          this.parseMessage(this.$el.querySelector('.messages'))
        }, 300)
      })
      .catch(err => {
        this.$toast.open({
          type: 'error',
          title: this.$t(`sidebar.chat.toasts.errors.get`),
          text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
        })
      })

    this.actions.chat.getOnlineUsers()
    socket.on('chat.connectedUsers', resp => {
      this.onlineMentions = []
      for (const key in resp) {
        if (resp.hasOwnProperty(key)) {
          this.onlineMentions.push(resp[key])
        }
      }
    })

    socket.on('chat.message', msg => {
      if (this.rooms.en.length >= 50) this.rooms.en.shift()

      msg = this.processMessage(msg)
      this.rooms.en.push(msg)
      this.scrollToBottom()

      this.$nextTick(() => {
        this.parseMessage(this.$el.querySelector('.messages .message:last-of-type'))
        if (msg.mentioned) {
          playSound('chat_mention', { volume: 0.5 })
        }

        if (msg.announcement) {
          playSound('chat_announcement', { volume: 0.8 })
        }
      })
    })

    if (this.$ls.get('chatRulesRead') !== null) {
      this.rulesRead = this.$ls.get('chatRulesRead')
    }

    socket.on('chat.clear', cb => {
      this.rooms.en = []
      this.rooms.en.push(
        this.processMessage({
          id: 'chatClear',
          message: 'Chat was cleared by a staff member.',
          announcement: true,
          date: Date.now()
        })
      )
      this.$nextTick(() => {
        this.parseMessage(this.$el.querySelector('.messages .message:last-of-type'))

        playSound('chat_announcement', { volume: 0.8 })
      })
    })

    socket.on('chat.purge', steamID => {
      this.rooms.en = this.rooms.en.filter(i => {
        if (i.announcement) return true
        return i.user.steamID !== steamID
      })
    })
  },
  computed: {
    user() {
      if (this.auth.authenticated) return this.auth.user
      else return null
    }
  },
  components: {
    Picker,
    Emoji
  }
}
