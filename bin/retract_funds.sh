#!/bin/bash

bindir=$(dirname "$0")

AMOUNT=$2
if [ -z "$2" ]; then
  AMOUNT=0
fi
curl -s -H 'Content-Type: application/json' -X POST -d "{ \"amount\": $AMOUNT }" http://localhost:8899/retract/$1 | $bindir/../node_modules/.bin/json
