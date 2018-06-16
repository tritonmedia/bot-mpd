/**
 * Bot attempt 2
 * 
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 2
 */

const TelegramBot = require('node-telegram-bot-api')
const MPD = require('./lib/mpd')
const debug = require('debug')('bot:main')

const mpd = new MPD()
const bot = new TelegramBot(require('./config/config.json').telegram, {
  polling: true
})

// O(3)
const database = {
  idDataMap: {}, // file -> data -> id
  dataMapId: {}, // data -> file -> id
  data: [],
  lastId: 0
}

const sendMessage = (id, text) => {
  return bot.sendMessage(id, text, {
    parse_mode: 'Markdown'
  })
}

/**
 * Add song to db or return it's current ID.
 * @param {String} file file name
 */
const addSong = file => {
  // we already stored the id
  const existingId = database.data.indexOf(file)
  if(existingId !== -1) {
    const id = database.dataMapId[existingId]
    return id
  }

  const newId = ++database.lastId
  const songPos = database.data.push(file)-1

  // Map the values.
  database.idDataMap[newId] = songPos
  database.dataMapId[songPos] = newId
  
  return newId
}

const getFile = id => {
  const pointer = database.idDataMap[id]
  if(!pointer) return false

  const data = database.data[pointer]
  if(!data) return false

  return data;
}

// Commands
bot.onText(/^\/start/, (msg, match) => {
  const chatId = msg.chat.id;
  const lines = [
    "Hello! I'm Asada, you can talk to me to interact with shinoradio.",
    "",
    "To *search* for a song, use /search or try to tell me to search for...",
    "Ask me \"*what's playing*\" to find out the current song,",
    "or even \"*what's next*\" to get a list of songs coming up next.",
    "",
    "If you have any questions, message [@jaredallard](telegram://jaredallard).",
    "🎵 https://music.tritonjs.com/stream 🎵"
  ]

  sendMessage(chatId, lines.join('\n'))
})

// search <type> <query>
const search = async (msg, match) => {
  const chatId = msg.chat.id;
  const type = match[1]
  const query = match[2].replace(/^\s+/g, '')

  sendMessage(chatId, `Searching for ${type} ${query}`)

  try {
    const res = await mpd.find(query)
    if(!res.success) throw new Error('I failed to talk to the server... oops.')
    if(!res.data[0]) throw new Error("I couldn't find anything...")

    const lines = [
      "I found these!",
      ""
    ]

    res.data.forEach(song => {
      const id = addSong(song.path)
      lines.push(` *${id}.* ${song.artist} - ${song.title}`)
    })

    lines.push("\nAdd any of these to the queue by ID with *play #ID*")

    return sendMessage(chatId, lines.join('\n'))
  } catch(err) {
    return sendMessage(chatId, err.message)
  }
}

const play = async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1].replace('#', '')

  const file = getFile(id)
  if(!file) return sendMessage(chatId, "I couldn't find that ID...")

  const res = await mpd.play(file)
  debug('player:queue', res)
  if(!res.success) return sendMessage(chatId, "I couldn't queue that right now, try again~? 🎵")
  sendMessage(chatId, `Added '${file}' to the queue!`)
}

const nowPlaying = async (msg) => {
  const chatId = msg.chat.id

  const res = await mpd.playing()
  debug('player', res)

  sendMessage(chatId, `Now Playing: *${res.data.artist} - 「${res.data.title}」*`)
}

const queue = async (msg) => {
  const chatId = msg.chat.id
  
  const res = await mpd.queue()
  debug('player:queue', res)
  if(!res.success) return sendMessage(chatId, "I failed to retrieve the queue....")
  const data = res.data

  debug('queue', data)

  const text = [
    "Here's what's currently next up:",
    ""
  ]
  data.forEach((song, index) => {
    const id = addSong(song.path)
    text.push(` *${id}.* ${song.artist} - ${song.title}`)
  })

  sendMessage(chatId, text.join('\n'))
}

// now playing
bot.onText(/^what(.?)s playing\??/, nowPlaying)
bot.onText(/^(\/?)playing/, nowPlaying)

// queue
bot.onText(/^(\/?)queue(d?)/, queue)
bot.onText(/^what(.?)s (next|queued)\??/, queue)

// search
bot.onText(/^\/search (\w+)?(.*)/, async (msg, match) => {
  const chatId = msg.chat.id
  const type = match[1]
  const query = match[2]

  if(!query) {
    return sendMessage(chatId, "Oops, you forgot to tell me the type! Try: /search artist RADWIMPS")
  }

  await search(msg, match)
})
bot.onText(/^(?:search|find) (?:for)?(?: ?the)? (\w+) (.+)/, search)

// play
bot.onText(/^play (#?\d+)/, play);
bot.onText(/^\/play (#?\d+)/, play)