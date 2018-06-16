FROM node:9.11-alpine

RUN apk add --no-cache dumb-init

WORKDIR "/app"
CMD [ "dumb-init", "node", "/app/index.js" ]

COPY package.json yarn.lock /app/
RUN yarn
COPY . /app