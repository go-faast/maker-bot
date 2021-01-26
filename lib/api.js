const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const logger = require('../lib/logger')

const api = express()

const port = Number(process.env.PORT) || 8899

function init ({ faastClient }) {
  api.use(bodyParser.json())

  api.get('/test/exchange/basic', (req, res) => {
    faastClient.requestTestExchangeBasic()
      .then((status) => res.status(200).send(status))
      .catch((err) => res.status(500).send({ error: err.message }))
  })

  api.get('/test/wallet/basic', (req, res) => {
    faastClient.requestTestWalletBasic()
      .then((status) => res.status(200).send(status))
      .catch((err) => res.status(500).send({ error: err.message }))
  })

  api.get('/status', (req, res) => {
    faastClient.requestStatus()
      .then((status) => res.status(200).send(status))
      .catch((err) => res.status(500).send({ error: err.message }))
  })

  api.get('/deposit/:currency', (req, res) => {
    faastClient.requestDepositAddress(req.params.currency.toUpperCase())
      .then((address) => res.status(200).send(address))
      .catch((err) => res.status(500).send({ error: err.message }))
  })

  api.post('/retract/:currency', (req, res) => {
    const params = {
      currency: req.params.currency.toUpperCase(),
      amount: req.body && req.body.amount
    }
    faastClient.requestRetractFunds(params)
      .then((address) => res.status(200).send(address))
      .catch((err) => res.status(500).send({ error: err.message }))
  })

  function start () {
    const server = http.createServer(api)
    server.listen(port)
    server.on('error', (err) => logger.log(err))
    server.on('listening', () => logger.log(`local API listening on ${port}`))
  }

  return {
    start
  }
}

module.exports = init
