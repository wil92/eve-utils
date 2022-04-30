FROM node:14.16-alpine3.11

WORKDIR /app

RUN npm install -g mongodb

COPY server.js ./server.js
COPY start.sh ./start.sh
COPY links.json ./links.json

CMD ["/bin/sh", "start.sh"]
