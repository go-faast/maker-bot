#!/bin/bash

bindir=$(dirname "$0")

curl -s http://localhost:8899/status | $bindir/../node_modules/.bin/json
