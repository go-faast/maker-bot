# Faast Maker Bot

An automated market maker bot for [faa.st](https://faa.st/market-maker). You must have registered for an account [here](https://faa.st/app/makers/register) before proceeding.

This should be installed on a dedicated 24/7 server, not a personal machine. Sporadic downtime will not be tolerated. The cheapest private server offerings from almost any cloud hosting provider is more than sufficient for this software. This has been tested on Ubuntu 18.04, but should work on many other debian based systems as well.

## Installation

Run the following command on your Ubuntu host to install the maker bot software. The installation script will prepare your system for secure operation and download the maker bot docker image. You'll be prompted to enter your faast credentials, exchange credentials, and generate a wallet.

```shell
bash -c "$(curl -fsSL https://raw.githubusercontent.com/go-faast/maker-bot/master/install.sh)"
```
