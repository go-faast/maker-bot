
const crypto = require('crypto')
const querystring = require('querystring')

const request = require('request')
// const HttpsProxyAgent = require('https-proxy-agent')
// const proxy = process.env.PROXY_URL
// const agent = proxy && new HttpsProxyAgent(proxy)

const REQUEST_TIMEOUT = 20 * 1000

class OKExRest {
  constructor ({
    key,
    secret,
    passphrase,
    password,
    hostIsAWS
  }) {
    this.key = key
    this.secret = secret
    this.passphrase = passphrase
    this.password = password
    this._baseUrl = hostIsAWS ? 'https://aws.okex.com' : 'https://www.okex.com'
  }

  _makeRequest (security, method, resource, query, done) {
    const params = this._getRequestParams(security, method.toUpperCase(), resource, query)

    request[method.toLowerCase()](params, (err, res, body) => {
      if (err) return done(err)
      if (!body) return done(new Error('no body in response'))
      if (body && (body.error || body.error_message)) {
        const error = new Error(body.error || body.error_message)
        return done(error, body)
      }
      if (res.statusCode < 200 || res.statusCode > 299) {
        const error = new Error('unknown error: ' + res.statusCode)
        return done(error, body)
      }
      done(null, body)
    })
  }

  _getRequestParams (security, method, resource, body) {
    const params = {
      url: `${this._baseUrl}${resource}`,
      method,
      timeout: REQUEST_TIMEOUT
    }
    if (method === 'GET') {
      params.qs = body
      params.json = true
    } else {
      params.json = body
    }

    if (security) {
      const { nonce, signature } = this._sign(method, resource, body, this.secret)
      params.headers = {
        'OK-ACCESS-KEY': this.key,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': nonce,
        'OK-ACCESS-PASSPHRASE': this.passphrase
      }
    }
    return params
  }

  _sign (method, resource, body, secret) {
    if (!body || Object.keys(body).length === 0) body = null
    const nonce = new Date().toISOString()
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(nonce, 'utf8')
    hmac.update(method, 'utf8')
    hmac.update(resource, 'utf8')
    if (method === 'POST') {
      if (body) hmac.update(JSON.stringify(body), 'utf8')
    } else {
      if (body) hmac.update('?' + querystring.stringify(body), 'utf8')
    }
    const signature = hmac.digest('base64')
    return { nonce, signature }
  }

  generic (instruction, done) {
    if (instruction.method === 'GET' && /.api.spot.v3.orders.\d+/.test(instruction.endpoint)) {
      // this is a bit of a hack to avoid a lot of additional complexity
      // until we see whether that complexity is needed for other cases
      // OKEx has a separate endpoint for trade fills and those fills
      // are the only source of fee data
      // so, on a trade lookup, also look up the fills and combine the responses
      this._makeRequest(
        instruction.security,
        instruction.method,
        instruction.endpoint,
        instruction.query,
        (err, trade) => {
          if (err) return done(err)
          if (!trade) return done(new Error('not found'))

          this._makeRequest(
            instruction.security,
            instruction.method,
            '/api/spot/v3/fills',
            instruction.query,
            (err, fills) => {
              if (err) return done(err)

              trade.fills = fills || []
              done(null, trade)
            }
          )
        }
      )
      return
    }

    return this._makeRequest(
      instruction.security,
      instruction.method,
      instruction.endpoint,
      instruction.query,
      done
    )
  }
}

module.exports = OKExRest
