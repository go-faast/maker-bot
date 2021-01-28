############################################################
# Dockerfile for Faast Maker Bot software
############################################################

FROM node:12-alpine
MAINTAINER Allan Hudgins (allan@bitaccess.co)

ENV NODE_ENV=production

RUN apk update && \
    apk add --no-cache bash curl
RUN apk add --no-cache --virtual build-dependencies build-base gcc wget git python3

RUN mkdir -p /usr/local/faast

WORKDIR /usr/local/faast

ADD package.json                  ./package.json
ADD package-lock.json             ./package-lock.json
RUN npm install --no-save --only=prod
RUN apk del build-dependencies

ADD lib                           ./lib
ADD bin                           ./bin
ADD config.js                     ./config.js
ADD maker.js                      ./maker.js
ADD README.md                     ./README.md

CMD ["bin/daemon.sh"]
