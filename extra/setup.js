#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const path = require("path");
const sqlite = require('sqlite3').verbose();
const shell = require('vorpal')();

const initialScriptArray = require('./createDBScript');
const got = require("got");
let isVerbose = false;

function queryEACH(db, sql, attributes, callback, complete) {
  db.each(sql, attributes, (err, row) => {
    err ? complete(err) : (row ? callback(row) : callback(null));
  }, complete);
}

async function queryEACHCall(database, ccpDatabase, sql, insertFun) {
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run('BEGIN;');

      let cont = 0;
      let readingFinish = false;
      queryEACH(ccpDatabase, sql, [], (row) => {
        cont++;
        insertFun(row, (err) => {
          if (err) {
            console.error(err)
            return reject(err);
          }
          cont--;
          if (cont === 0 && readingFinish) {
            database.run('COMMIT;', (err) => {
              err ? reject(err) : resolve();
            });
          }
        });
      }, (err) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        readingFinish = true;
      });
    });
  });
}

async function syncAction(database, ccpDatabase, tableLocal, paramsLocal, tableCCP, paramsCCP) {
  const paramsRes = paramsLocal.reduce((p, v, i) => i ? `${p}, ${v}` : v, '');
  const paramsExtra = paramsLocal.reduce((p, v, i) => i ? `${p}, ?` : '?', '');
  const sql = `INSERT INTO ${tableLocal} (${paramsRes}) VALUES (${paramsExtra});`;
  await queryEACHCall(database, ccpDatabase, `SELECT * FROM ${tableCCP};`, (row, next) => {
    database.run(sql, paramsCCP.map(pa => row[pa]), next);
  });
}

async function syncWormholesAction(database, ccpDatabase) {
  const sql = `UPDATE system SET system_class=? WHERE id=?;`;
  const sql2 = `SELECT ss.solarSystemID, wc.wormholeClassID FROM mapSolarSystems ss INNER JOIN mapLocationWormholeClasses wc ON ss.regionID = wc.locationID;`;
  await queryEACHCall(database, ccpDatabase, sql2, (row, next) => {
    database.run(sql, [
      +row['wormholeClassID'] <= 6 ? 'C' + row['wormholeClassID'] : +row['wormholeClassID'] === 7 ? 'HS' : +row['wormholeClassID'] === 9 ? 'NS' : 'C' + row['wormholeClassID'],
      row['solarSystemID']
    ], next);
  });
}

async function syncLowSecAction(database, ccpDatabase) {
  const sql = `UPDATE system SET system_class=? WHERE id=?;`;
  const sql2 = `SELECT ss.solarSystemID, wc.wormholeClassID FROM mapSolarSystems ss INNER JOIN mapLocationWormholeClasses wc ON ss.solarSystemID = wc.locationID;`;
  await queryEACHCall(database, ccpDatabase, sql2, (row, next) => {
    database.run(sql, [
      +row['wormholeClassID'] === 8 ? 'LS' : row['wormholeClassID'] + '',
      row['solarSystemID']
    ], next);
  });
}

async function initDatabase(ccpDB, version) {
  const dbPath = path.join(__dirname, `${version}.data.db`);

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const database = new sqlite.Database(dbPath);

  await initialScriptArray.reduce((p, sql) => {
    isVerbose && console.log(sql);
    return p.then(() => {
      return new Promise((resolve, reject) => {
        database.run(sql, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    })
  }, Promise.resolve());

  const ccpDatabase = new sqlite.Database(ccpDB);

  // SET DB VERSION
  const sqlNewVersion = 'INSERT INTO config (key, data) VALUES ("version", ?);';
  await new Promise((resolve, reject) =>
    database.run(sqlNewVersion, [version], (err) => err ? reject(err) : resolve()));

  // EVE_TYPE TABLE
  isVerbose && console.log('Start eve_type table synchronization');
  await syncAction(database, ccpDatabase,
    'eve_type', ['id', 'name', 'description', 'capacity', 'mass', 'volume'],
    'invTypes', ['typeID', 'typeName', 'description', 'capacity', 'mass', 'volume']);

  // REGION TABLE
  isVerbose && console.log('Start region table synchronization');
  await syncAction(database, ccpDatabase,
    'region', ['id', 'name'],
    'mapRegions', ['regionID', 'regionName']);

  // CONSTELLATION TABLE
  isVerbose && console.log('Start constellation table synchronization');
  await syncAction(database, ccpDatabase,
    'constellation', ['id', 'name', 'region_id'],
    'mapRegions', ['constellationID', 'constellationName', 'regionID']);

  // SYSTEM TABLE
  isVerbose && console.log('Start system table synchronization');
  await syncAction(database, ccpDatabase,
    'system', ['id', 'name', 'security_status', 'security_class', 'constellation_id', 'region_id'],
    'mapSolarSystems', ['solarSystemID', 'solarSystemName', 'security', 'securityClass', 'constellationID', 'regionID']);

  // STATION TABLE
  isVerbose && console.log('Start station table synchronization');
  await syncAction(database, ccpDatabase,
    'station', ['id', 'name', 'office_rental_cost', 'reprocessing_efficiency', 'reprocessing_stations_take', 'system_id', 'type_id'],
    'staStations', ['stationID', 'stationName', 'officeRentalCost', 'reprocessingEfficiency', 'reprocessingStationsTake', 'solarSystemID', 'stationTypeID']);

  // SYNC UNIVERSE SYSTEM'S CLASSES
  isVerbose && console.log('Start wormhole, HS and NS classes synchronization');
  await syncWormholesAction(database, ccpDatabase);
  isVerbose && console.log('Start LS class synchronization');
  await syncLowSecAction(database, ccpDatabase);

  // CLOSE DATABASES CONNECTION
  await new Promise((resolve, reject) => database.close((err) => err ? reject(err) : resolve()));
  await new Promise((resolve, reject) => ccpDatabase.close((err) => err ? reject(err) : resolve()));
}

shell
  .command('gendb <ccpDBPath> <dbVersion>')
  .option('-v, --verbose', 'Show all not relevant logs.')
  .description('Generate the new database version, base in the CCP database information.')
  .action((args, cb) => {
    isVerbose = args.options['verbose'];
    initDatabase(args['ccpDBPath'], args['dbVersion']).then(() => cb());
  });

async function readAttr(args) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  if (!args.name) {
    args.name = await new Promise(resolve => rl.question("name: ", ans => resolve(ans)));
  }
  if (!args.url) {
    args.url = await new Promise(resolve => rl.question("url: ", ans => resolve(ans)));
  }
  rl.close();
}

async function newLink(args) {
  await readAttr(args);

  const linksFile = path.join(__dirname, '..', 'links.json');
  const data = JSON.parse(fs.readFileSync(linksFile, "utf8"));
  if (!data.links.some(value => value.name === args.name)) {
    data.links.push({name: args.name, url: args.url});
  }
  data.links.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(linksFile, JSON.stringify(data, null, '  '), "utf8");
}

async function readLinks() {
  while (true) {
    await newLink({});
  }
}

shell
  .command('new link [name] [url]')
  .description('Add new links to the JSON file used by the application.')
  .action((args, cb) => {
    newLink(args).then(() => cb());
  });

shell
  .command('new links')
  .description('Add new links to the JSON file used by the application.')
  .action((args, cb) => {
    readLinks(args).then(() => cb());
  });

async function linksSynchronization() {
  const got = require('got');
  const jsdom = require("jsdom");
  const {JSDOM} = jsdom;

  const initialUrl = 'https://eve-survival.org';

  const getPage = async (url) => {
    const response = await got(url);
    return new JSDOM(response.body);
  };

  const isInternalLink = (url) => {
    return url.startsWith('https://eve-survival.org');
  };

  const isNotDirectLink = (url) => {
    const c = [/\?.*=.*\/.*$/, /\?.*=.*#.*$/, /\?.*=.*&.*$/];
    return c.reduce((p, v) => p || v.test(url), false);
  };

  const linksFile = path.join(__dirname, '..', 'links.json');
  const data = JSON.parse(fs.readFileSync(linksFile, "utf8"));

  const queue = [initialUrl];

  const urlsSet = new Set();
  [initialUrl,
    'https://eve-survival.org/wikka.php?wakka=AnomalyReports',
    'https://eve-survival.org/wikka.php?wakka=HomePage',
    'https://eve-survival.org/wikka.php?wakka=QnA',
    'https://eve-survival.org/wikka.php?wakka=TheTeam',
    'https://eve-survival.org/wikka.php?wakka=UserDocumentation',
    'https://eve-survival.org/wikka.php?wakka=OurMission'
  ].forEach(l => {
    urlsSet.add(l);
    urlsSet.add(l + '#');
  });

  while (queue.length > 0) {
    const url = queue.shift();
    console.log(url);

    let dom;
    try {
      dom = await getPage(url);
    } catch (e) {
      continue;
    }

    const links = [...dom.window.document.querySelectorAll('a')];
    for (let i = 0; i < links.length; i++) {
      const href = links[i].href;
      if (isInternalLink(href) && !isNotDirectLink(href) && !urlsSet.has(href)) {
        urlsSet.add(href);
        urlsSet.add(href + '#');
        queue.push(href);
      }
    }

    const title = dom.window.document.querySelector('h1');
    if (title) {
      const href = title.children[0].href;
      if (`${url}#` === href) {
        let name = title.children[0].text;
        name = name.trim().replace(/ +/g, ' ');

        if (!data.links.some(value => value.name === name)) {
          data.links.push({name, url});
        }
      }
    }
  }

  data.links.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(linksFile, JSON.stringify(data, null, '  '), "utf8");
}

shell
  .command('links sync')
  .description('Sync link from https://eve-survival.org.')
  .action((args, cb) => {
    linksSynchronization(args).then(() => cb());
  });

shell
  .delimiter('db-script$')
  .show()
  .parse(process.argv);
