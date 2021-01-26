
const logger = require('../lib/logger')

const bip39 = require('bip39')
const { CoinPayments, Bitcoin } = require('@faast/coin-payments')
const DelegateLogger = require('@faast/ts-common').DelegateLogger

const createSignature = require('../lib/auth')
const connectionManager = require('../lib/connection')

function init (config) {
  const paymentsLogger = new DelegateLogger(logger)
  const seed = bip39.mnemonicToSeedSync(config.walletMnemonic).toString('hex')

  const wallets = {
    payments: makeWallet('payments', seed),
    paymentsHotWallet: makeWallet('paymentsHotWallet', seed)
  }
  const Exchange = require(`../lib/exchanges/${config.exchange}`)
  const exchangeCredentials = config.credentials[config.exchange]
  const exchange = new Exchange(exchangeCredentials)
  const pendingResponses = new Map()

  async function onEvent (event) {
    logger.log(' incoming message:', event.type, event.id)
    logger.dir(event)
    try {
    // TODO: rename rftl
    // TODO: error handling/reporting
      if (event.rtfl) {
      // TODO: promisify
        const exchangeRequest = {
          ...event.rtfl,
          query: amendExchangePayload(event.rtfl)
        }
        exchange.generic(exchangeRequest, (err, result) => {
          if (err) logger.debug('exchange.generic error:', err.message)
          logger.debug('exchange.generic result:', result)
          logger.log('outgoing response:', event.type, event.id)
          connectionManager.send('response', { type: event.type, id: event.id, rtfl: event.rtfl, result })
        })
      } else if (event.type === 'WalletSignatureRequest') {
        const wallet = getWalletForAccountId(event.payload.accountId)
        if (!wallet) {
          const result = { error: `unrecognized accountId: ${event.payload.accountId}` }
          connectionManager.send('response', { type: event.type, id: event.id, rtfl: event.rtfl, result })
        }

        const payments = wallet.forNetwork(event.payload.network)
        const signedTx = await payments.signTransaction(event.payload.unsignedTx)
        const result = { gtid: event.payload.gtid, signedTx }
        logger.log('outgoing response:', event.type, event.id)
        connectionManager.send('response', { type: event.type, id: event.id, rtfl: event.rtfl, result })
      } else if (event.type === 'SwapActivityNotification') {
        logger.log('notification received:', event.type, event.id, event.payload.type, event.payload.subjectId)
        logger.debug('notification:', event)
      } else if (event.type === 'disconnect') {
        logger.log('server requested disconnection:', event.type)
        logger.debug('forcibly disconnected:', event)
      } else if (event.category === 'response') {
        logger.log('response received:', event.type, event.id)
        pendingResponses.set(event.id, event)
      } else {
        logger.log('unknown event:', event.type)
        logger.debug('unknown event:', event)
      }
    } catch (err) {
      logger.log('error caught:', err.message)
      const result = { error: err.message }
      connectionManager.send('response', { type: event.type, id: event.id, rtfl: event.rtfl, result })
    }
  }

  function onConnect () {
    const signon = {
      id: config.credentials.faast.id,
      clientVersion: config.clientVersion,
      auth: {
        key: config.credentials.faast.key,
        signature: createSignature('signon', config.credentials.faast.secret)
      },
      config: {
        exchange: config.exchange,
        networks: config.supportedNetworks,
        walletParams: {
          org: config.credentials.faast.id,
          payments: wallets.payments.getPublicConfig(),
          paymentsHotWallet: wallets.paymentsHotWallet.getPublicConfig()
        }
      }
    }
    logger.dir('signon:', signon)
    connectionManager.send('signon', signon)
  }

  function start () {
    logger.debug(config.serviceUrl)
    connectionManager.connect({ url: config.serviceUrl, onConnect, onEvent })
  }

  async function sendRequest (request) {
    connectionManager.send('request', request)
    const response = await awaitResponse(request.id)
    return { result: response.result }
  }

  async function awaitResponse (requestId, timeout = 10 * 1000) {
    const spinCycle = 100
    let remaining = Math.floor(timeout / spinCycle)
    return new Promise((resolve, reject) => {
      const checkForResponse = () => {
        // TODO: need something to clear out old pendingResponses
        const response = pendingResponses.get(requestId)
        if (response) {
          logger.debug('found pending response:', requestId)
          pendingResponses.delete(requestId)
          resolve(response)
        } else if (remaining === 0) {
          reject(new Error('timeout waiting for response'))
        } else {
          remaining -= 1
          setTimeout(checkForResponse, spinCycle)
        }
      }
      checkForResponse()
    })
  }

  async function requestTestExchangeBasic () {
    const requestId = `${config.credentials.faast.id}-${Date.now()}`
    return sendRequest({ type: 'TestExchangeBasic', id: requestId })
  }

  async function requestTestWalletBasic () {
    const requestId = `${config.credentials.faast.id}-${Date.now()}`
    return sendRequest({ type: 'TestWalletBasic', id: requestId })
  }

  async function requestStatus () {
    const requestId = `${config.credentials.faast.id}-${Date.now()}`
    return sendRequest({ type: 'GetStatus', id: requestId })
  }

  async function requestDepositAddress (currency) {
    const requestId = `${config.credentials.faast.id}-${Date.now()}`
    return sendRequest({ type: 'GetDepositAddress', id: requestId, payload: { currency } })
  }

  async function requestRetractFunds (params) {
    const requestId = `${config.credentials.faast.id}-${Date.now()}`
    return sendRequest({ type: 'RetractFunds', id: requestId, payload: params })
  }

  function doStuffWeWontDoHereInTheFuture () {
    // TODO: do this during market-maker on-boarding
    config.supportedNetworks.forEach(initNetwork)

    function initNetwork (networkSymbol) {
      const networkPayments = wallets.payments.forNetwork(networkSymbol)
      if (typeof networkPayments.initAccounts === 'function') {
        networkPayments.init()
          .then(() => networkPayments.initAccounts())
          .then(() => networkPayments.destroy())
          .catch((err) => logger.error(`error initializing payment wallet for ${networkSymbol}: ${err.message}`))
      }
    }
  }

  function makeWallet (type, seed) {
    let walletConfig = {}
    if (process.env.TEST_WALLET === 'true') {
      walletConfig = { network: 'testnet' }
    }
    if (type === 'paymentsHotWallet') {
      // BTC/LTC-only hotwallet
      walletConfig.seed = seed
      walletConfig.BTC = { addressType: Bitcoin.AddressType.SegwitNative }
      walletConfig.LTC = { addressType: Bitcoin.AddressType.SegwitNative }
    } else {
      // seed enables all supported assets
      walletConfig.seed = seed
      walletConfig.BTC = { addressType: Bitcoin.AddressType.SegwitP2SH }
      walletConfig.LTC = { addressType: Bitcoin.AddressType.SegwitP2SH }
    }
    return new CoinPayments({ ...walletConfig, logger: paymentsLogger })
  }

  function getWalletForAccountId (accountId) {
    const walletName = Object.keys(wallets).find((walletName) => {
      const wallet = wallets[walletName]
      return wallet && wallet.getAccountIds().includes(accountId)
    })
    return wallets[walletName]
  }

  function amendExchangePayload (rtfl) {
    if (!rtfl.amendments) return rtfl.query

    const amendedPayload = { ...rtfl.query }
    Object.keys(rtfl.amendments).forEach((payloadKey) => {
      let amendedValue
      const amendment = rtfl.amendments[payloadKey]
      if (amendment.source === 'exchange_credentials') {
        amendedValue = exchangeCredentials[amendment.id]
      }
      amendedPayload[payloadKey] = amendedValue
    })
    return amendedPayload
  }

  doStuffWeWontDoHereInTheFuture()

  return {
    start,
    requestTestExchangeBasic,
    requestTestWalletBasic,
    requestStatus,
    requestDepositAddress,
    requestRetractFunds
  }
}

module.exports = init
