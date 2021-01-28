
const IO = require('socket.io-client')
const logger = require('../lib/logger')

const MIN_RECONNECT_DELAY = 2
const MAX_RECONNECT_DELAY = 5 * 60

const connectionManager = {
  connectionAttempts: 0,
  connectionTimeout: null,
  socket: null,
  callbacks: {
    connected: () => {},
    disconnected: () => {}
  },
  onConnect: function (connection) {
    logger.log('connected')
    connectionManager.callbacks.connected()
  },

  onConnectError: function (err) {
    logger.log('connect error', err.message)
    connectionManager.onDisconnect()
  },

  onConnectTimeout: function (timeout) {
    logger.log('connect timeout', timeout)
    connectionManager.onDisconnect()
  },

  onError: function (err) {
    logger.log('error', err.message)
  },

  onDisconnect: function (reason) {
    if (connectionManager.connectionTimeout) return
    logger.log('disconnected')

    let delay = (2 ** ++connectionManager.connectionAttempts)
    if (delay > MAX_RECONNECT_DELAY) delay = MAX_RECONNECT_DELAY
    if (delay < MIN_RECONNECT_DELAY) delay = MIN_RECONNECT_DELAY
    logger.log(`reconnecting in ${delay} sec...`)
    setTimeout(() => {
      connectionManager.socket.connect()
      connectionManager.connectionTimeout = setTimeout(() => {
        connectionManager.connectionTimeout = null
        if (!connectionManager.socket.connected) {
          connectionManager.onDisconnect()
        } else {
          connectionManager.connectionAttempts = 0
        }
      }, 5 * 1000)
    }, delay * 1000)
  },

  onReconnect: function (attempts) {
    logger.log('reconnected', attempts)
  },

  onReconnectAttempt: function (attempt) {
    logger.log('attempting to reconnect', attempt)
  },

  onReconnecting: function (attempt) {
    logger.log('reconnecting', attempt)
  },

  onReconnectError: function (err) {
    logger.log('reconnect error', err.message)
  },

  onReconnectFailed: function () {
    logger.log('reconnect failed')
  }
}

function connect ({ url, onConnect, onEvent }) {
  connectionManager.callbacks.connected = onConnect
  connectionManager.socket = IO(url, { reconnection: false })

  connectionManager.socket.on('connect', connectionManager.onConnect)
  connectionManager.socket.on('connect_error', connectionManager.onConnectError)
  connectionManager.socket.on('connect_timeout', connectionManager.onConnectTimeout)
  connectionManager.socket.on('error', connectionManager.onError)
  connectionManager.socket.on('disconnect', connectionManager.onDisconnect)
  connectionManager.socket.on('reconnect', connectionManager.onReconnect)
  connectionManager.socket.on('reconnect_attempt', connectionManager.onReconnectAttempt)
  connectionManager.socket.on('reconnecting', connectionManager.onReconnecting)
  connectionManager.socket.on('reconnect_error', connectionManager.onReconnectError)
  connectionManager.socket.on('reconnect_failed', connectionManager.onReconnectFailed)

  connectionManager.socket.on('event', onEvent)
}

function send (event, data) {
  connectionManager.socket.emit(event, data)
}

module.exports = {
  connect,
  send
}
