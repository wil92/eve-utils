const fs = require('fs');
const path = require("path");
const sqlite = require('sqlite3').verbose();
const initialScriptArray = require('./createDB');

let database;

let databaseName = 'data.db';

async function initDatabase() {
  const dbPath = path.join(__dirname, databaseName);
  console.log(dbPath);

  database = new sqlite.Database(dbPath);

  return initialScriptArray.reduce((p, sql) => {
    console.log(sql);
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
}

function showHelp() {

}
