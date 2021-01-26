#!/bin/bash

set -e

Yellow='\033[0;33m'
Color_Off='\033[0m'

echo "You are about to generate a 24-word secret recovery seed which will be used to create your wallet for all coins."
echo "When shown please write down these words and store them somewhere securely. Ideally using pen and paper."
echo -e "${Yellow}Warning: Anyone that has access to this recovery seed will have control over all funds in your wallet.${Color_Off}"
echo -e "${Yellow}Warning: Do not lose this or your wallet will be unrecoverable and all funds will be lost.${Color_Off}"

getResponse() {
  echo ""
  echo "I understand that I am responsible for securely storing my secret recovery seed."
  read -p "Type 'yes' if you agree and wish to proceed: " response
}

getResponse

while [ "$response" != 'yes' ]; do
  echo ""
  echo 'Sorry, you must read, understand, and agree to all of the above in order to proceed.'
  echo "If you do understand and tried to agree, please try again."
  echo "Ensure you type exactly 'yes' in all lowercase and without quotes before hitting enter/return."
  getResponse
done

WALLET_MNEMONIC=$(node -e "console.log(require('bip39').generateMnemonic(256))")

node -e "
console.log([
  'Secret wallet phrase:\n',
  '========================\n\n',
  ...('${WALLET_MNEMONIC}'.split(' ').map((w, i) => String(i+1) + ': ' + w + '\n')),
  '\n\n========================\n',
  'After writing down type q to exit',
].join(''))" | less

echo "export WALLET_MNEMONIC='$WALLET_MNEMONIC'" >> "$(dirname "$0")/settings.temp"