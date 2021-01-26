#!/bin/bash

VERSION=$(node -e "console.log(require('./package.json').version)")

docker tag maker-bot:$VERSION faasthub/maker-bot:$VERSION
docker tag maker-bot:$VERSION faasthub/maker-bot:latest

docker push -a faasthub/maker-bot
