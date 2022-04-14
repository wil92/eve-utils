const http = require('http');
const fs = require('fs');
const path = require('path');

const port = +(process.env.PORT || 4538);
const downloadFolder = process.env.DOWNLOAD_FOLDER || './download';

// login code redirection code
function loginController(req, res) {
  console.log('new authentication at:', new Date());
  res.writeHead(200);
  res.end('authenticated');
}

function linksController(req, res) {
  const links = fs.readFileSync(path.join(__dirname, 'links.json'), {encoding: "utf8"});
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(links, 'utf-8');
}

function dbVersionController(req, res) {
  const result = fs.readdirSync(downloadFolder).filter(function (file) {
    return file.endsWith('.sqlite')
  });
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(result), 'utf-8');
}

// download files
function downloadDBController(req, res) {
  const fileName = req.url.replace(/^\/download\/db\//, '');
  const filePath = path.join(downloadFolder, fileName);
  res.writeHead(200, {'Content-Type': 'application/x-sqlite3'});
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('data', (chunk) => res.write(chunk));
  fileStream.on('close', () => {
    res.end('The file was successfully downloaded\n');
  });
  fileStream.on('error', () => {
    res.statusCode = 500;
    res.end('An error occurred with the downloadable file\n');
  });
}


const requestListener = function (req, res) {
  if (req.url.startsWith('/download/db')) {
    downloadDBController(req, res);
    return;
  }
  if (req.url === '/db-versions') {
    dbVersionController(req, res);
    return;
  }
  if (req.url === '/links') {
    linksController(req, res);
    return;
  }

  loginController(req, res);
}

const server = http.createServer(requestListener);
server.listen(port);
