const fs = require('fs');

const sqlite = require('sqlite3').verbose();

const databaseName = 'data.db';

let database;

module.exports = {

  async initDatabase() {
    const isNewDB = !fs.existsSync(databaseName);
    database = new sqlite.Database(databaseName);

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

  async removeOpportunity(opportunityId) {
    const opportunity = await this.getOpportunity(opportunityId);
    return new Promise((resolve, reject) => {
      database.serialize(() => {
        database.run('DELETE FROM market_opportunity WHERE id=?;', [opportunityId]);
        database.run('DELETE FROM market_order WHERE id=? OR id=?;', [opportunity['buyer_id'], opportunity['seller_id']], (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
  },

  async getOpportunity(opportunityId) {
    return new Promise((resolve, reject) => {
      database.get('SELECT * FROM market_opportunity WHERE id=?', [opportunityId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
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

  async getRegions() {
    return new Promise((resolve, reject) => {
      database.all('SELECT * from region;', [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        rows ? resolve(rows) : resolve([]);
      });
    });
  },

  async getAllRegions() {
    return new Promise((resolve, reject) => {
      database.all('select * from region;', [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      })
    });
  },

  async getAllStationsByRegionId(regionId) {
    return new Promise((resolve, reject) => {
      database.all('SELECT s.* FROM station AS s INNER JOIN system AS sy ON sy.id = s.system_id INNER JOIN constellation AS c ON c.id = sy.constellation_id WHERE c.region_id = ?;', [regionId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      })
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

  getOrders(regions, callback, end) {
    let sql = 'SELECT * FROM market_order;';
    if (+regions[0] !== -1) {
      let where = `c.region_id = ${regions[0]}`;
      for (let i = 1; i < regions.length; i++) {
        where += ` OR c.region_id = ${regions[i]}`;
      }

      sql = `SELECT mo.* FROM market_order AS mo INNER JOIN system AS s ON s.id = mo.system_id INNER JOIN constellation AS c ON c.id = s.constellation_id WHERE ${where};`;
    }
    console.log(sql);
    database.serialize(() => {
      database.each(sql, (err, result) => {
        callback(err, result);
      }, () => {
        end();
      });
    });
  },

  async getMarketOpportunities(page = 0, pageSize = 20, moneyLimit) {
    let where = '';
    if (moneyLimit) {
      where = `WHERE sell < ${moneyLimit}`;
    }
    return new Promise((resolve, reject) => {
      const sql = `SELECT *, (SELECT s.name FROM station AS s INNER JOIN market_order AS o ON s.id = o.location_id WHERE mo.buyer_id = o.id) buyer_place, (SELECT s2.name FROM station AS s2 INNER JOIN market_order AS o2 ON s2.id = o2.location_id WHERE mo.seller_id = o2.id) seller_place FROM market_opportunity AS mo ${where} LIMIT ? OFFSET ?;`
      database.all(sql, [pageSize, page * pageSize], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  },

  async getMarketOpportunitiesCount(moneyLimit) {
    let where = '';
    if (moneyLimit) {
      where = `WHERE sell < ${moneyLimit}`;
    }
    return new Promise((resolve, reject) => {
      database.all(`SELECT count(*) as total FROM market_opportunity ${where};`, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows[0].total);
      });
    });
  },

  async cleanMarketOpportunity() {
    return new Promise((resolve, reject) => {
      database.run('DELETE FROM market_opportunity;', [], (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  },

  async saveMarketOpportunities(opportunities = []) {
    return new Promise((resolve, reject) => {
      database.serialize(() => {
        database.run('BEGIN;');

        opportunities.forEach(o => this.saveMarketOpportunity(o));

        database.run('COMMIT;', (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
  },

  async saveMarketOpportunity(o) {
    await this.saveEntity('INSERT OR REPLACE INTO market_opportunity (id, earning, available, requested, buy, sell, type_id, buyer_id, seller_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [o['id'], o['earning'], o['available'], o['requested'], o['buy'], o['sell'], o['type_id'], o['buyer_id'], o['seller_id']]);
  },

  async saveGraphic(g) {
    await this.saveEntity('INSERT OR REPLACE INTO graphic (id, file) VALUES(?, ?);',
      [g['graphic_id'], g['graphic_file']]);
  },

  async saveType(t) {
    await this.saveEntity('INSERT OR REPLACE INTO type (id, name, capacity, description, mass, packaged_volume , published, radius, volume, graphic_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [t['type_id'], t['name'], t['capacity'], t['description'], t['mass'], t['packaged_volume'], t['published'], t['radius'], t['volume'], t['graphic_id']]);
  },

  async saveRegion(r) {
    await this.saveEntity('INSERT OR REPLACE INTO region (id, name, description) VALUES(?, ?, ?);',
      [r['region_id'], r['name'], r['description']]);
  },

  async saveConstellation(c) {
    await this.saveEntity('INSERT OR REPLACE INTO constellation (id, name, region_id) VALUES(?, ?, ?);',
      [c['constellation_id'], c['name'], c['region_id']]);
  },

  async saveSystem(s) {
    await this.saveEntity('INSERT OR REPLACE INTO system (id, name, security_status, security_class, constellation_id) VALUES(?, ?, ?, ?, ?);',
      [s['system_id'], s['name'], s['security_status'], s['security_class'], s['constellation_id']]);
  },

  async saveStation(s) {
    await this.saveEntity('INSERT OR REPLACE INTO station (id, name, office_rental_cost, reprocessing_efficiency, reprocessing_stations_take , system_id, type_id) VALUES(?, ?, ?, ?, ?, ?, ?);',
      [s['station_id'], s['name'], s['office_rental_cost'], s['reprocessing_efficiency'], s['reprocessing_stations_take'], s['system_id'], s['type_id']]);
  },

  async cleanOrders() {
    return new Promise((resolve, reject) => {
      database.run('DELETE FROM market_order;', [], (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  },

  async saveOrders(orders = []) {
    return new Promise((resolve, reject) => {
      database.serialize(() => {
        database.run('BEGIN;');

        orders.forEach(o => {
          database.run(
            'INSERT OR REPLACE INTO market_order (id, duration, is_buy_order, issued, min_volume, price, range, volume_remain, volume_total, type_id, system_id, location_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [o['order_id'], o['duration'], o['is_buy_order'], o['issued'], o['min_volume'], o['price'], o['range'], o['volume_remain'], o['volume_total'], o['type_id'], o['system_id'], o['location_id']]);
        });

        database.run('COMMIT;', (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
  },

  async saveOrder(o) {
    await this.saveEntity('INSERT OR REPLACE INTO market_order (id, duration, is_buy_order, issued, min_volume, price, range, volume_remain, volume_total, type_id, system_id, location_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [o['order_id'], o['duration'], o['is_buy_order'], o['issued'], o['min_volume'], o['price'], o['range'], o['volume_remain'], o['volume_total'], o['type_id'], o['system_id'], o['location_id']]);
  },

  async saveEntity(sql, attributes) {
    return new Promise((resolve, reject) => {
      database.run(sql, attributes, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }
  ,

  terminateDBConnection() {
    database.close();
  }
}
;
