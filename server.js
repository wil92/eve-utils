const http = require('http');

const port = +(process.env.PORT || 4538);

const requestListener = function (req, res) {
  console.log('new authentication at:', new Date());
  res.writeHead(200);
  res.end('authenticated');
}

const server = http.createServer(requestListener);
server.listen(port);
