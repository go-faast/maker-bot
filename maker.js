const config = require('./config')

const makerConfig = {
  clientVersion: config.clientVersion,
  serviceUrl: config.serviceUrl,
  exchange: config.enabledExchange,
  credentials: config.credentials,
  walletMnemonic: config.walletMnemonic,
  supportedNetworks: config.supportedNetworks
}

Object.keys(makerConfig).forEach((key) => {
  if (typeof makerConfig[key] === 'undefined') {
    console.error(key, 'is blank')
    process.exit(1)
  }
})

console.log(`Starting maker bot version ${makerConfig.clientVersion}`)

const faastClient = require('./lib/client')(makerConfig)
const apiService = require('./lib/api')({ faastClient })

faastClient.start()
apiService.start()
