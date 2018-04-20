
/**
 * Music Bot
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */
'use strict';

const debug = require('debug')('bot')
const Shino = require('shinojs')
const request = require('request-promise')

const API_URL = process.env.API_URL || 'http://127.0.0.1:8100'

let app;

/**
 * Wait for x time
 * @param  {Number} [int=5000] [description]
 * @return {Promise}           .then on finish
 */
const wait  = (int = 1300) => {
  return new Promise(resolv => {
    setTimeout(resolv, int)
  })
}

const init = async () => {

  app = new Shino(require('./config/config.json'), 'telegram')

  debug('init', 'init shino')
  await app.init()

  /**
   * Erro wrapper
   * @param {Object} msg - {ShinoJS.message}
   */
  const error = msg => msg.reply("I'm sorry, I couldn't communicate with the server 😢")

  /**
   * Queue a song to play next
   * @param {String} path - File path
   * @param {ShinoJS.Message} msg  - Message Object
   */
  const queueSong = async (path, msg) => {
    const res = await request.post({
      uri: `${API_URL}/v1/player/queue`,
      body: {
        file: path
      },
      json: true
    })

    if(!res.success) return error(msg)

    await msg.reply(`OK! I queued ${artist} - ${title} for you!`)
  }

  app.register('nowplaying', async (adapter, msg) => {
    const res = await request.get({
      uri: `${API_URL}/v1/player/status`,
      json: true
    })
    if(!res.success) return error(msg)

    const data = res.data

    debug('now-playing', data)
    msg.reply(`Now playing: ${data.title} by ${data.artist} 🎵`)
  })

  app.register('queue_next', async (adapter, msg) => {
    const res = await request.get({
      uri: `${API_URL}/v1/player/queue?limit=5`,
      json: true
    })
    if(!res.success) return error(msg)
    const data = res.data

    debug('queue', data)

    const text = [
      "Here's what's currently next up:"
    ]
    data.forEach((song, index) => {
      text.push(` ${index+1}. ${song.artist} - ${song.title}`)
    })

    msg.reply(text.join('\n'))
  })

  // Hacky attempt at getting unrecognized output to
  // queue a song / search for it.
  app.register('search', async (adapter, msg, details) => {
    // TODO: need to implement in shino
    const song = msg.text

    debug('searching for', song)
    const res = await request.post({
      uri: `${API_URL}/v1/search`,
      body: {
        query: song
      },
      json: true
    })
    if(!res.success) return error(msg)
    const data = res.data

    console.log(msg.analysis)

    if(!data[0]) {
      details.setContext('')
      return msg.reply(`I'm sorry, but I couldn't find a song by '${song}'.`)
    }

    if(data.length === 1) {
      details.setContext('')
      return queueSong(data[0].path, msg)
    }

    if(data.length > 10) return msg.reply("I'm sorry... but I found too many songs with that name. Please be more specific!")

    const map = {}
    const text = [
      "I found these songs! Please give me a number if you'd like to listen to it now!",
      ""
    ]
    data.forEach((song, index) => {
      const num = index + 1
      map[num] = song
      text.push(` ${num}. ${song.artist} - ${song.title}`)
    })

    text.push('\nOr say anything else to cancel!')

    details.stash(map)
    msg.reply(text.join('\n'))
  })

  app.register('search:next', async (adapter, msg, details) => {
    const stash = details.getStash() || {}

    debug('stash', stash)

    if(!stash[msg.text]) {
      return msg.reply("OK! I won't play any of these.")
    }

    const { title, artist, path } = stash[msg.text]

    await queueSong(path, msg)
  })

  app.register('start', async (adapater, msg) => {
    const lines = [
      "Hello! I'm Asada, you can talk to me to interact with shinoradio.",
      "",
      "To *search* for or *play* a song, just type it!",
      "Ask me \"*what's playing*\" to find out the current song,",
      "or even \"*what's next*\" to get a list of songs coming up next.",
      "",
      "If you have any questions, message [@jaredallard](telegram://jaredallard)."
    ]
    msg.reply(lines.join('\n'))
  })

  app.register('like', async (adapater, msg) => {
    msg.reply("I'm glad you like it!~ 🎵")
  })

  app.on('dm', {
    version: 2,
    classifiers: [
      'playing',
      ['song', 'this'],
      ['what\'s', 'playing']
    ],
    action: 'nowplaying'
  })

  app.on('dm', {
    version: 2,
    classifiers: [
      'queue',
      'what\'s next'
    ],
    action: 'queue_next'
  })

  // /start handler
  app.on('dm', {
    version: 2,
    address: 'start',
    text: '/start',
    action: 'start'
  })

  app.on('dm', {
    version: 2,
    address: 'like',
    text: '👍',
    action: 'like'
  })

  // search handler
  app.on('dm', {
    version: 2,
    address: 'unknown',
    classifiers: [
      'search'
    ],
    default: 'drop',
    action: 'search',
    children: [
      {
        version: 2,
        address: 'next',
        action: 'search:next'
      }
    ]
  })

  app.done()
}


// Don't just get a "oh fuck a promise failed" message.
process.on('unhandledRejection', reason => {
  console.log('Unhandled Promise Rejection', reason)
});

// start the application
init()