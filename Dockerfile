FROM debian:stable-20220527-slim

WORKDIR /usr/src/app

RUN apt-get update -y && apt-get upgrade -y

RUN apt-get install -y build-essential libssl-dev curl wget

RUN apt-get install -y nodejs npm

RUN mkdir node_modules

RUN mkdir node_modules/.bin

RUN touch node_modules/.bin/forever

RUN chmod 755 -R node_modules/.bin/forever

RUN npm install -g n

RUN n 12.22.12

RUN npm install -g npm

RUN npm install -g daab

RUN npm install -g kuromoji

RUN npm install -g sequelize

RUN npm install -g pg

RUN npm install -g googleapis

RUN npm install -g clarifai

RUN apt-get purge nodejs npm -y

RUN apt-get autoremove -y

RUN apt-get install -y python3

RUN rm -rf /var/lib/apt/lists/*