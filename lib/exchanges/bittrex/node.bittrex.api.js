/* ============================================================
 * node.bittrex.api
 * https://github.com/n0mad01/node.bittrex.api
 *
 * ============================================================
 * Copyright 2014-2017, Adrian Soluch - http://soluch.us/
 * Released under the MIT License
 * ============================================================ */
const NodeBittrexApi = function (options) {
  const request = require('request')
  const hmacSha512 = require('./hmac-sha512.js')

  let start
  const requestOptions = {
    method: 'GET',
    agent: false,
    headers: {
      'User-Agent': 'Mozilla/4.0 (compatible; Node Bittrex API)',
      'Content-type': 'application/x-www-form-urlencoded'
    }
  }
  const opts = {
    baseUrl: 'https://bittrex.com/api/v1.1',
    apikey: options.key,
    apisecret: options.secret,
    verbose: false,
    cleartext: false
  }

  function getNonce () {
    return Math.floor(new Date().getTime() / 1000)
  }

  function apiCredentials (uri) {
    const options = {
      apikey: opts.apikey,
      nonce: getNonce()
    }

    return setRequestUriGetParams(uri, options)
  }

  function setRequestUriGetParams (uri, options) {
    let op
    if (typeof (uri) === 'object') {
      op = uri
      uri = op.uri
    } else {
      op = requestOptions
    }

    const o = Object.keys(options)

    for (let i = 0; i < o.length; i++) {
      uri = updateQueryStringParameter(uri, o[i], options[o[i]])
    }

    op.headers.apisign = hmacSha512.HmacSHA512(uri, opts.apisecret) // setting the HMAC hash `apisign` http header
    op.uri = uri

    return op
  }

  function updateQueryStringParameter (uri, key, value) {
    const re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i')
    const separator = uri.indexOf('?') !== -1 ? '&' : '?'

    if (uri.match(re)) {
      uri = uri.replace(re, '$1' + key + '=' + value + '$2')
    } else {
      uri = uri + separator + key + '=' + value
    }

    return uri
  }

  function sendRequestCallback (callback, op) {
    start = Date.now()

    request(op, function (error, result, body) {
      if (!body || !result || result.statusCode !== 200) {
        callback(null, { error: error, result: result })
      } else {
        try {
          callback(null, opts.cleartext ? body : JSON.parse(body))
          if (opts.verbose) console.log('requested from ' + result.request.href + ' in: %ds', (Date.now() - start) / 1000)
        } catch (err) {
          callback(err, result)
        }
      }
    })
  }

  return {
    generic: function (instruction, callback) {
      let op
      if (instruction.security === 'SIGNED') {
        op = setRequestUriGetParams(apiCredentials(opts.baseUrl + instruction.endpoint), instruction.query)
      } else {
        op = requestOptions
        op.uri = setRequestUriGetParams(opts.baseUrl + instruction.endpoint, instruction.query)
      }
      return sendRequestCallback(callback, op)
    }
  }
}

module.exports = NodeBittrexApi
