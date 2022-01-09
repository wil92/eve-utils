const fs = require('fs');

const sqlite = require('sqlite3').verbose();

const databaseName = 'data.db';

let database;

module.exports = () => {

  return {

    async initDatabase() {
      const isNewDB = !fs.existsSync(databaseName);
      database = new sqlite.Database(databaseName);

      // toDo 08.01.22, guille, create database
      console.log('----------------------',isNewDB);
      if (isNewDB) {
        const initialScriptArray = require('./createDB');

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
    },

    async loadObjValue(key) {
      const res = await this.loadValue(key);
      try {
        return JSON.parse(res + '');
      } catch (e) {
        console.error(e);
        return {}
      }
    },

    async loadNumValue(key) {
      const res = await this.loadValue(key);
      return res ? +res : null;
    },

    async loadValue(key) {
      const sql = 'SELECT * from config WHERE key=?;';
      return new Promise((resolve, reject) => {
        database.get(sql, [key], (err, row) => {
          if (err) {
            return reject(err);
          }
          row ? resolve(row.data) : resolve(null);
        });
      });
    },

    async saveValue(key, value) {
      return new Promise((resolve, reject) => {
        const data = typeof value === "object" ? JSON.stringify(value) : value;
        database.run(`INSERT
        OR REPLACE INTO config (key, data) VALUES(?, ?)`, [key, data], function (err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    },

    terminateDBConnection() {
      database.close();
    }
  };
};
