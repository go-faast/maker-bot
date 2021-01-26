#!/bin/bash

set -e

echo ""
echo "┌──────────────────────────────────────────────────────────────────────────────┐"
echo "│ Welcome to the Faast maker bot setup. Please follow the prompts to complete. │"
echo "└──────────────────────────────────────────────────────────────────────────────┘"
echo ""

bindir=$(dirname "$0")
temp="$bindir/settings.temp"
settings="$bindir/../host/settings.sh"

addSetting() {
  echo "export $1='$2'" >> $temp
  source $temp
}

getSetting() {
  SETTING_TYPE=$1
  SETTING_VAR=$2
  SETTING_NAME=$3
  SETTING_VALUE=""
  EXTRA_FLAGS=''
  if [ $SETTING_TYPE = "secret" ]; then
    # disable echo of sensitive inputs
    EXTRA_FLAGS="$EXTRA_FLAGS -s"
  fi
  while [ -z "$SETTING_VALUE" ]; do
    read $EXTRA_FLAGS -r -p "Enter your $SETTING_NAME: " SETTING_VALUE
    if [ $SETTING_TYPE = "optional" ]; then
      break
    fi
  done
  if [ $SETTING_TYPE = "secret" ]; then
    # read -s doesn't add newline
    echo ""
  fi
  addSetting $SETTING_VAR $SETTING_VALUE
}

echo "" > $temp
chmod 700 $temp

getSetting required FAAST_MAKER_ID "Faast Maker ID"
getSetting secret FAAST_SECRET "Faast API Secret"

echo ""
echo "The following exchange credentials you enter will be stored locally only and never sent elsewhere."
echo "For help setting up an exchange API key see https://faa.st/app/makers/setup/exchanges"

addSetting EXCHANGE binance # Default for now
getSetting required EXCHANGE_KEY "$EXCHANGE API Key"
getSetting secret EXCHANGE_SECRET "$EXCHANGE API Secret"

echo ""

"$bindir/generate_wallet.sh"

echo "Setup complete."

mv $temp $settings

cp "$bindir/host/*" "$bindir/../host"
echo "Copied external scripts to host."

echo "Run ./start.sh to start your maker bot and connect to Faast."
echo "Run ./upgrade.sh to upgrade your maker bot."
echo "Run ./status.sh to retrieve detailed client status."
echo "Run ./command.sh for other functionality."
echo ""
echo "Maker bot setup complete."
