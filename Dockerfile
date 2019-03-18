FROM node:10

# Based on instructions at https://github.com/segmentio/nightmare/issues/224
RUN apt-get update

# Installing the packages needed to run Nightmare
RUN apt-get install -y \
  xvfb \
  x11-xkb-utils \
  xfonts-100dpi \
  xfonts-75dpi \
  xfonts-scalable \
  xfonts-cyrillic \
  x11-apps \
  clang \
  libdbus-1-dev \
  libgtk2.0-dev \
  libnotify-dev \
  libgnome-keyring-dev \
  libgconf2-dev \
  libasound2-dev \
  libcap-dev \
  libcups2-dev \
  libxtst-dev \
  libxss1 \
  libnss3-dev \
  gcc-multilib \
  g++-multilib

ENV DEBUG="nightmare:*,electron:*"

RUN mkdir -p /app
WORKDIR /app
COPY package.json /app
COPY package-lock.json /app
#USER node
RUN npm install
COPY --chown=node:node . /app
RUN mkdir -p /app/tmp

#CMD ["snaps-nightmare.js"]
CMD xvfb-run -a node --harmony snaps-nightmare.js
