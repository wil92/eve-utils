FROM node:14.16-alpine3.11

WORKDIR /app

COPY server.js ./server.js
COPY start.sh ./start.sh
COPY links.json ./links.json

CMD ["/bin/sh", "start.sh"]
