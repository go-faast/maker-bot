#!/bin/bash

bindir=$(dirname "$0")

curl -s http://localhost:8899/deposit/$1 | $bindir/../node_modules/.bin/json
