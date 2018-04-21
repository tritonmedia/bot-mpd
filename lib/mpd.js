/**
 * MPD Library
 * 
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1
 */

const request = require('request-promise-native')
const debug   = require('debug')('bot:mpd')

const API_URL = process.env.API_URL || 'http://127.0.0.1:8100'

class MPDApi {
  constructor(token = null) {
    this.headers = {
      Authorization: token
    }
  }

  /**
   * GET an endpoint
   * @param {String} endpoint endpoint to hit
   */
  get(endpoint) {
    return this.request('GET', endpoint)
  }

  /**
   * POST an endpoint
   * @param {String} endpoint endpoint to hit
   * @param {*} data data object
   */
  post(endpoint, data = null) {
    return this.request('POST', endpoint, data)
  }

  /**
   * Make a request.
   * @param {String} method Method type
   * @param {String} endpoint Endpoint URL
   * @param {*} data Data URL
   */
  request(method, endpoint, data = null) {
    const uri = `${API_URL}${endpoint}`
    const opts = {
      uri,
      json: true,
      headers: this.headers,
      method
    }

    if(data) {
      opts.body = data
    }

    debug(method, uri, data)
    return request(opts)
  }

  /**
   * Attempt to find {name}
   * @param {String} name 
   * @returns {Arrray} of choices
   */
  find(name) {
    return this.post('/v1/search', {
      query: name
    })
  }

  play(file) {
    return this.post('/v1/player/queue', {
      file
    })
  }

  playing() {
    return this.get('/v1/player/status')
  }

  queue() {
    return this.get('/v1/player/queue?limit=10')
  }
}

module.exports = MPDApi;
