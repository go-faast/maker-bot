#!/bin/bash

export SERVICE_URL='https://mm.faa.st'

if [ -d /config ]; then
  . /config/settings.sh
  node maker
else
  echo "Missing settings file. Must be mapped into the docker container at /config/settings.sh"
  exit 1
fi

