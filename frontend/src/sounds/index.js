import { Howl, Howler } from 'howler'
import clamp from 'lodash-es/clamp'

/**
 * FFMPEG COMMANDS FOR BATCH CONVERSION
 *
 * WAV -> MP3: FOR /F "tokens=*" %G IN ('dir /b *.wav') DO ffmpeg -i "%G" -acodec mp3 "%~nG.mp3"
 * WAV -> WEBM: FOR /F "tokens=*" %G IN ('dir /b *.wav') DO ffmpeg -i "%G" "%~nG.webm"
 */

const SOUNDS = {
  // toasts
  toast_success: 'toast/success',
  toast_info: 'toast/info',
  toast_error: 'toast/error',
  toast_warning: 'toast/warning',

  // chat
  chat_mention: 'chat/mention',
  chat_send: 'chat/send',
  chat_announcement: 'chat/announcement'
}

export function play(sound, options) {
  if (!sound) return console.error('[sound.js] no sound provided')

  var setup = {
    src: [require(`./${SOUNDS[sound]}.webm`), require(`./${SOUNDS[sound]}.mp3`)],
    format: ['webm', 'mp3'],
    autoplay: true,
    preload: true
  }

  if (options.volume) options.volume = clamp(options.volume, 0, Howler.volume())
  setup = Object.assign(setup, options)

  new Howl(setup)
}

export function setVolume(vol) {
  Howler.volume(vol)
}

export function getVolume() {
  return Howler.volume()
}

export function setMute(state) {
  Howler.mute(state)
}
