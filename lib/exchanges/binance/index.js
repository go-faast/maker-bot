
const request = require('request')
const qs = require('querystring')
const _ = require('underscore')
const crypto = require('crypto')
// const Beautifier = require('./beautifier.js')
const assert = require('assert')
const HttpsProxyAgent = require('https-proxy-agent')
const proxy = process.env.PROXY_URL
const agent = proxy && new HttpsProxyAgent(proxy)

class BinanceRest {
  constructor ({
    key,
    secret,
    recvWindow = false,
    timeout = 15000,
    disableBeautification = false,
    handleDrift = false
  }) {
    this.key = key
    this.secret = secret
    this.recvWindow = recvWindow
    this.timeout = timeout
    this.disableBeautification = disableBeautification
    this.handleDrift = handleDrift

    // this._beautifier = new Beautifier()
    this._baseUrl = 'https://api.binance.com'
    this._drift = 0
    this._syncInterval = 0
  }

  _makeRequest (query, callback, route, security, method, attempt = 0) {
    assert(_.isUndefined(callback) || _.isFunction(callback), 'callback must be a function or undefined')
    assert(_.isObject(query), 'query must be an object')

    let queryString
    const type = _.last(route.split('/'))

    const options = {
      url: `${this._baseUrl}${route}`,
      timeout: this.timeout
    }

    if (security === 'SIGNED') {
      if (this.recvWindow) {
        query.recvWindow = this.recvWindow
      }
      queryString = qs.stringify(query)
      options.url += '?' + queryString
      if (options.url.substr(options.url.length - 1) !== '?') {
        options.url += '&'
      }
      options.url += `signature=${this._sign(queryString)}`
    } else {
      queryString = qs.stringify(query)
      if (queryString) {
        options.url += '?' + queryString
      }
    }
    if (security === 'API-KEY' || security === 'SIGNED') {
      options.headers = { 'X-MBX-APIKEY': this.key }
      if (agent) options.agent = agent
    }
    if (method) {
      options.method = method
    }

    if (callback) {
      request(options, (err, response, body) => {
        let payload
        try {
          payload = JSON.parse(body)
        } catch (e) {
          payload = body
        }
        if (err) {
          callback(err, payload)
        } else if (response.statusCode < 200 || response.statusCode > 299) {
          /*
           * If we get a response that the timestamp is ahead of the server,
           * calculate the drift and then attempt the request again
           */
          if (response.statusCode === 400 && payload.code === -1021 &&
                        this.handleDrift && attempt === 0) {
            this.calculateDrift()
              .then(() => {
                query.timestamp = this._getTime() + this._drift
                return this._makeRequest(query, callback, route, security, method,
                  ++attempt)
              })
          } else {
            callback(new Error(`Response code ${response.statusCode}`), payload)
          }
        } else {
          if (_.isArray(payload)) {
            payload = _.map(payload, (item) => {
              return this._doBeautifications(item, type)
            })
          } else {
            payload = this._doBeautifications(payload)
          }
          callback(err, payload)
        }
      })
    } else {
      return new Promise((resolve, reject) => {
        request(options, (err, response, body) => {
          let payload
          if (err) {
            reject(err)
          } else {
            try {
              payload = JSON.parse(body)
            } catch (e) {
              payload = body
            }

            if (response.statusCode < 200 || response.statusCode > 299) {
              /*
               * If we get a response that the timestamp is ahead of the server,
               * calculate the drift and then attempt the request again
               */
              if (response.statusCode === 400 && payload.code === -1021 &&
                                this.handleDrift && attempt === 0) {
                this.calculateDrift()
                  .then(() => {
                    query.timestamp = this._getTime() + this._drift
                    return this._makeRequest(query, callback, route, security,
                      method, ++attempt)
                  })
                  .then(retryPayload => {
                    resolve(retryPayload)
                  })
                  .catch(retryErr => {
                    reject(retryErr)
                  })
              } else {
                reject(payload)
              }
            } else {
              if (_.isArray(payload)) {
                payload = _.map(payload, (item) => {
                  return this._doBeautifications(item, type)
                })
              } else {
                payload = this._doBeautifications(payload)
              }
              resolve(payload)
            }
          }
        })
      })
    }
  }

  _doBeautifications (response, route) {
    return response
    // if (this.disableBeautification) {
    //   return response
    // }
    // return this._beautifier.beautify(response, route)
  }

  _sign (queryString) {
    return crypto.createHmac('sha256', this.secret)
      .update(queryString)
      .digest('hex')
  }

  _setTimestamp (query) {
    if (!query.timestamp) {
      query.timestamp = this._getTime() + this._drift
    }
  }

  _getTime () {
    return new Date().getTime()
  }

  calculateDrift () {
    const systemTime = this._getTime()
    return this.time()
      .then((response) => {
        // Calculate the approximate trip time from here to binance
        const transitTime = parseInt((this._getTime() - systemTime) / 2)
        this._drift = response.serverTime - (systemTime + transitTime)
      })
  }

  startTimeSync (interval = 300000) {
    // If there's already an interval running, clear it and reset values
    if (this._syncInterval !== 0) {
      this.endTimeSync()
    }

    // Calculate initial drift value and setup interval to periodically update it
    this.calculateDrift()
    this._syncInterval = setInterval(() => {
      this.calculateDrift()
    }, interval)
  }

  endTimeSync () {
    clearInterval(this._syncInterval)
    this._drift = 0
    this._syncInterval = 0
  }

  generic (instruction, callback) {
    const query = instruction.query
    this._setTimestamp(query)
    return this._makeRequest(query, callback, instruction.endpoint, instruction.security, instruction.method)
  }
}

module.exports = BinanceRest
