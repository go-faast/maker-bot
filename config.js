/* eslint-disable no-console, no-process-env, no-process-exit */

const localConfig = {}

localConfig.clientVersion = '2.0.0'
localConfig.logLevel = process.env.DEBUG === 'true' ? 'debug' : 'notice'
localConfig.serviceUrl = process.env.SERVICE_URL || 'https://mm.faa.st'
localConfig.enabledExchange = process.env.EXCHANGE || 'binance'
localConfig.credentials = {
  faast: {
    id: process.env.FAAST_MAKER_ID,
    key: process.env.FAAST_MAKER_ID,
    secret: process.env.FAAST_SECRET
  }
}
localConfig.credentials[localConfig.enabledExchange] = {
  key: process.env.EXCHANGE_KEY,
  secret: process.env.EXCHANGE_SECRET,
  passphrase: process.env.EXCHANGE_PASSPHRASE,
  password: process.env.EXCHANGE_PASSWORD,
  hostIsAWS: false
}
localConfig.walletMnemonic = process.env.WALLET_MNEMONIC
const allNetworks = ['BTC', 'TRX', 'XLM', 'ETH', 'LTC', 'BCH', 'DOGE']
localConfig.supportedNetworks = allNetworks

module.exports = localConfig
