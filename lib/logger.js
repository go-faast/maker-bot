
const util = require('util')

const config = require('../config')

const logger = {}

;['debug', 'log', 'notice', 'warn', 'error', 'trace'].forEach((level) => {
  logger[level] = function (...args) {
    const method = typeof console[level] === 'function' ? level : 'log'
    console[method](new Date(), ...args)
  }
})

if (config.logLevel === 'debug') {
  logger.debug = logger.log
  logger.dir = (...args) => args.forEach((arg) => typeof arg === 'object' ? logger.log(util.inspect(arg, { depth: null })) : logger.log(arg))
} else {
  logger.debug = () => {}
  logger.dir = logger.debug
}

module.exports = logger
