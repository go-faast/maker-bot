#!/bin/bash

bindir=$(dirname "$0")

case "$1" in
  (exchange)
    curl -s http://localhost:8899/test/exchange/basic | $bindir/../node_modules/.bin/json;;
  (wallet)
    curl -s http://localhost:8899/test/wallet/basic | $bindir/../node_modules/.bin/json;;
esac
