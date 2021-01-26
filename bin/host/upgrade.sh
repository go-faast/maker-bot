#!/bin/bash
DIR=$(dirname $0)

printf "Pulling latest image...\n"

existingHash=$(docker images --digests | grep maker-bot | grep latest | tr -s ' ' | cut -f3 -d' ')
incomingHash=$(docker pull faasthub/maker-bot:latest | grep Digest | cut -f2 -d' ')

printf "Existing image hash: $existingHash\n"
printf "Incoming image hash: $incomingHash\n"
if [ "$existingHash" = "$incomingHash" ]; then
  printf "Maker bot already up-to-date.\n"
  exit 0
fi

printf "Maker bot client upgraded, restarting...\n"

"$DIR/stop.sh"

printf "Removing container "
docker rm faast-maker-bot

"$DIR/start.sh"

printf "Clearing out previous versions...\n"
previousVersions=$(docker images -f "dangling=true" -q)
if [ -z "$previousVersions" ]; then
  docker rmi $previousVersions
fi

printf "Upgrading external scripts...\n"
docker cp faast-maker-bot:/usr/local/faast/bin/host $DIR
mv host/* .
rm -rf host
