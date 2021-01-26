
const IO = require('socket.io-client')
const logger = require('../lib/logger')

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
    logger.log('disconnected')
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
  connectionManager.socket = IO(url, { reconnection: true })

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
