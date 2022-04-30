const http = require('http');
const fs = require('fs');
const path = require('path');
const {MongoClient} = require("mongodb");

const port = +(process.env.PORT || 4538);
const downloadFolder = process.env.DOWNLOAD_FOLDER || './download';
const mongodbUri = process.env.MONGODB_URI || "mongodb://eve-database:27017";

// SETTING UP DB
const dbConfig = {};

async function settingUpDB() {
  // Create a new MongoClient
  dbConfig.client = new MongoClient(mongodbUri);

  async function run() {
    await dbConfig.client.connect();
    console.log("Connected successfully to db server");
  }

  dbConfig.saveAnomalies = async (anomalies) => {
    const database = dbConfig.client.db('eve');
    const anomalyCollection = database.collection('anomaly');
    for (let anomaly of anomalies) {
      const query = {id: anomaly.id, system_id: anomaly.system_id};
      const it = await anomalyCollection.findOne(query);
      if (it) {
        await anomalyCollection.updateOne(query, {$set: anomaly});
      } else {
        await anomalyCollection.insertOne(anomaly);
      }
    }
  };

  dbConfig.loadAnomalies = async () => {
    const database = dbConfig.client.db('eve');
    const anomalyCollection = database.collection('anomaly');
    return anomalyCollection.find().toArray();
  };

  dbConfig.removeAnomalies = async (anomalies) => {
    const database = dbConfig.client.db('eve');
    const anomalyCollection = database.collection('anomaly');
    for (let anomaly of anomalies) {
      await anomalyCollection.deleteOne({id: anomaly.id, system_id: anomaly.system_id});
    }
  };

  return run();
}

// CORS
function injectCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

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
    return file.endsWith('.sqlite') || file.endsWith('.db');
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

// ANOMALIES
function anomalies(req, res) {
  switch (req.method) {
    case 'GET':
      loadAnomalies(req, res);
      return;
    case 'POST':
      readBodyFromRequest(req).then((body) => {
        req.body = body;
        if (req.url === '/anomalies') {
          saveAnomalies(req, res);
        } else {
          removeAnomalies(req, res);
        }
      });
      break;
  }
}

async function readBodyFromRequest(req) {
  let body = '';
  return new Promise((resolve) => {
    req.on('data', chunk => body += chunk);
    req.on('end', chunk => {
      try {
        const jsonBody = JSON.parse(body);
        resolve(jsonBody);
      } catch (e) {
        resolve(body);
      }
    });
  });
}

function saveAnomalies(req, res) {
  dbConfig.saveAnomalies(req.body).then(() => {
    res.statusCode = 200;
    res.end('Anomalies saved\n');
  }).catch(err => {
    console.error(err);
    res.statusCode = 500;
    res.end('Error saving anomalies in db\n');
  });
}

function removeAnomalies(req, res) {
  dbConfig.removeAnomalies(req.body).then(() => {
    res.statusCode = 200;
    res.end('Anomalies removed\n');
  }).catch(err => {
    console.error(err);
    res.statusCode = 500;
    res.end('Error removing anomalies from db\n');
  });
}

function loadAnomalies(req, res) {
  dbConfig.loadAnomalies().then((anomalies) => {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(anomalies), 'utf-8');
  }).catch(err => {
    console.error(err);
    res.statusCode = 500;
    res.end('Error to get anomalies from db\n');
  });
}


const requestListener = function (req, res) {
  injectCORS(res);

  console.log(req.url)
  if (req.url.startsWith('/anomalies')) {
    anomalies(req, res);
    return;
  }
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
settingUpDB()
  .then(() => {
    console.log('Server is running');
    return server.listen(port);
  })
  .catch(console.dir);
