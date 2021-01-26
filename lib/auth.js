const crypto = require('crypto')

function createSignature (message, secret) {
  const nonce = ~~(Date.now() / 10000)
  const hmac = crypto.createHmac('sha256', secret)
  hmac.setEncoding('hex')
  hmac.update(nonce.toString(), 'utf8')
  hmac.update(message, 'utf8')
  hmac.end()
  return hmac.read()
}

module.exports = createSignature
