#!/bin/bash

VERSION=$(node -e "console.log(require('./package.json').version)")

docker tag maker-bot:$VERSION faasthub/maker-bot:$VERSION
docker tag maker-bot:$VERSION faasthub/maker-bot:latest

docker trust sign --local faasthub/maker-bot:$VERSION
docker trust sign --local faasthub/maker-bot:latest
