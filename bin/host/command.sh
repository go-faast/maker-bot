#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <status|deposit|retract> <args>"
  exit 1
fi

case "$1" in
  (test)
    if [ -z "$2" ]; then
      echo "Usage: $0 test <exchange|wallet>"
      exit 1
    fi
    docker exec -it faast-maker-bot /usr/local/faast/bin/test_setup.sh $2;;
  (status)
    docker exec -it faast-maker-bot /usr/local/faast/bin/fetch_status.sh $2;;
  (deposit)
    if [ -z "$2" ]; then
      echo "Usage: $0 deposit <currency>"
      exit 1
    fi
    docker exec -it faast-maker-bot /usr/local/faast/bin/fetch_deposit_address.sh $2;;
  (retract)
    if [ -z "$2" ]; then
      echo "Usage: $0 retract <currency> [amount]"
      echo "If no amount is specified, full wallet balance will be retracted to exchange."
      exit 1
    fi
    docker exec -it faast-maker-bot /usr/local/faast/bin/retract_funds.sh $2 $3;;
esac
