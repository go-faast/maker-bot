#!/bin/bash

VERSION=$(node -e "console.log(require('./package.json').version)")

docker build -t maker-bot:$VERSION -t maker-bot:prerelease .
