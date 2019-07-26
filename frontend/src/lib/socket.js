import io from 'socket.io-client'

var loc = document.location.origin

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
)

if (isLocalhost) loc = 'https://lootvgo.com'

var socket = io(loc, {
  reconnect: true,
  transports: ['websocket']
})

socket.on('error', console.error)

if (process.env.NODE_ENV === 'development') window.socket = socket
if (document.location.hostname.includes('dev')) window.socket = socket

export default socket
