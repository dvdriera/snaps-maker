FROM node:10
RUN apt-get update
RUN apt-get install libxss1
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
COPY package.json /app
USER node
RUN npm install
COPY --chown=node:node . /app
RUN mkdir /app/tmp
CMD DEBUG=nightmare:*,electron:* node snaps-nightmare.js

