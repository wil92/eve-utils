const fs = require('fs');
const path = require("path");
const semver = require('semver');
const sqlite = require('sqlite3').verbose();

const httpService = require('./HttpService');
const databaseName = 'data.db';

let database;

module.exports = {

  async initDatabase(savePath) {
    const dbPath = path.join(savePath, databaseName);
    console.log(dbPath);
    const lastDBName = await this.getLastAvailableDBVersion();

    if (!fs.existsSync(dbPath)) {
      await this.downloadDB(lastDBName, dbPath);
    }
    database = new sqlite.Database(dbPath);

    const currentDBVersion = await this.loadValue('version');
    console.log(lastDBName);
    if (lastDBName && currentDBVersion !== this.extractVersion(lastDBName)) {
      // toDo guille 19.04.22: safe user data is missing
      this.terminateDBConnection();
      await this.downloadDB(lastDBName, dbPath);
      database = new sqlite.Database(dbPath);
    }
  },

  async downloadDB(dbName, dbPath) {
    const downloadUrl = `https://eveutils.guilledev.com/download/${dbName}`;
    await httpService.utilsDownload(downloadUrl, dbPath);
  },

  async getLastAvailableDBVersion() {
    const versionsUrl = `https://eveutils.guilledev.com/db-versions`;
    const versions = await httpService.utilsGET(versionsUrl);
    if (Array.isArray(versions)) {
      return versions.sort((a, b) => semver.rcompare(this.extractVersion(a), this.extractVersion(b), null))[0];
    }
    return null;
  },

  /**
   * @param name {string}
   */
  extractVersion(name) {
    return /\d+.\d+(.\d+)*/.exec(name)[0];
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
    const ordersIdsToRemove = [];

    let orderIdToUpdate = 0;
    let remain = 0;
    if (opportunity.available - opportunity.requested > 0) {
      orderIdToUpdate = opportunity['seller_id'];
      remain = opportunity.available - opportunity.requested;
    } else if (opportunity.available - opportunity.requested < 0) {
      orderIdToUpdate = opportunity['buyer_id'];
      remain = opportunity.requested - opportunity.available;
    }

    let where = '';
    if (opportunity.available - opportunity.requested <= 0) {
      ordersIdsToRemove.push(opportunity['seller_id']);
      where = 'id=?';
    }
    if (opportunity.requested - opportunity.available <= 0) {
      ordersIdsToRemove.push(opportunity['buyer_id']);
      where = where + (where === '' ? '' : ' OR ') + 'id=?';
    }

    await new Promise((resolve, reject) => {
      database.serialize(() => {
        database.run('DELETE FROM market_opportunity WHERE id=?;', [opportunityId]);
        database.run(`DELETE
                      FROM market_order
                      WHERE ${where};`, ordersIdsToRemove, (err) => {
          err ? reject(err) : resolve();
        });
      });
    });

    if (remain > 0) {
      await new Promise((resolve, reject) => {
        database.run('UPDATE market_order SET volume_remain=? WHERE id=?;', [remain, orderIdToUpdate], (err) => {
          err ? reject(err) : resolve();
        });
      });
    }
  },

  async getOpportunity(opportunityId) {
    return new Promise((resolve, reject) => {
      database.get('SELECT * FROM market_opportunity WHERE id=?', [opportunityId], (err, row) => {
        err ? reject(err) : resolve(row);
      });
    });
  },

  async getSystemById(systemId) {
    return new Promise((resolve, reject) => {
      database.get('SELECT * FROM system WHERE id=?', [systemId], (err, row) => {
        err ? reject(err) : resolve(row);
      });
    });
  },

  /**
   * @param systemName {string}
   * @return {Promise<unknown>}
   */
  async getSystemByName(systemName) {
    return new Promise((resolve, reject) => {
      database.get('SELECT * FROM system WHERE UPPER(name)=?', [systemName.toUpperCase()], (err, row) => {
        err ? reject(err) : resolve(row);
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
        err ? reject(err) : (row ? resolve(row.data) : resolve(null));
      });
    });
  },

  async getRegions() {
    return new Promise((resolve, reject) => {
      database.all('SELECT * from region;', [], (err, rows) => {
        err ? reject(err) : (rows ? resolve(rows) : resolve([]));
      });
    });
  },

  async getAllRegions() {
    return new Promise((resolve, reject) => {
      database.all('select * from region;', [], (err, rows) => {
        err ? reject(err) : resolve(rows);
      })
    });
  },

  async getSecurityStatus(route) {
    const ids = route.reduce((p, v, i) => p + (i > 0 ? ' OR ' : '') + `s.id = ${v}`, '');
    let solution = -1;
    return new Promise((resolve, reject) => {
      database.each(`SELECT security_status
                     FROM system s
                     WHERE ${ids};`, (err, row) => {
        solution = Math.min(row['security_status']);
      }, () => resolve(solution));
    });
  },

  async getAllStationsByRegionId(regionId) {
    return new Promise((resolve, reject) => {
      database.all('SELECT s.* FROM station AS s INNER JOIN system AS sy ON sy.id = s.system_id INNER JOIN constellation AS c ON c.id = sy.constellation_id WHERE c.region_id = ?;', [regionId], (err, rows) => {
        err ? reject(err) : resolve(rows);
      })
    });
  },

  async saveValue(key, value) {
    return new Promise((resolve, reject) => {
      const data = typeof value === "object" ? JSON.stringify(value) : value;
      database.run(`INSERT
      OR REPLACE INTO config (key, data) VALUES(?, ?)`, [key, data], function (err) {
        err ? reject(err) : resolve();
      });
    });
  },

  /**
   * @param anomalies {{id: string, expiration: number, name: string, category: number, type: number, life: string, mass: string}[]}
   * @param systemId {number}
   * @return {Promise<void>}
   */
  async saveAnomaliesAndRemoveMissing(anomalies, systemId) {
    const oldAnomalies = await this.loadAnomaliesBySystemId(systemId);
    const used = new Set();
    anomalies.forEach(a => used.add(a.id));

    await new Promise((resolve, reject) => {
      database.serialize(() => {
        database.run('BEGIN;');

        for (let i = 0; i < oldAnomalies.length; i++) {
          if (!used.has(oldAnomalies[i].id)) {
            this.removeAnomalyById(oldAnomalies[i].id, systemId);
          }
        }

        database.run('COMMIT;', err => err ? reject(err) : resolve());
      });
    });

    for (let i = 0; i < anomalies.length; i++) {
      await this.saveAnomaly(anomalies[i], systemId);
    }
  },

  /**
   * @param anomaly {{id: string, expiration: number, name: string, category: number, type: number, life: string, mass: string}}
   * @param systemId {number}
   * @param destinationSystem {number|null}
   * @return {Promise<unknown>}
   */
  async saveAnomaly(anomaly, systemId, destinationSystem = null) {
    return new Promise((resolve, reject) => {
      database.run(`INSERT
              OR REPLACE INTO anomaly (id, name, type, expiration, life, mass, system_id, system_destination) VALUES(?, ?, ?, ?, ?, ?, ?, ?);`,
        [anomaly.id, anomaly.name, anomaly.type, anomaly.expiration, anomaly.life, anomaly.mass, systemId, destinationSystem], function (err) {
          err ? reject(err) : resolve();
        });
    });
  },

  /**
   * @param anomalyId {string}
   * @param systemId {number}
   * @return {Promise<unknown>}
   */
  async removeAnomalyById(anomalyId, systemId) {
    return new Promise((resolve, reject) => {
      database.run('DELETE FROM anomaly WHERE id=? AND system_id=?;', [anomalyId, systemId], err => err ? reject(err) : resolve());
    });
  },

  /**
   * @param systemId {number}
   * @return {Promise<{id: string, expiration: number, name: string, category: number, type: number, life: string, mass: string}[]>}
   */
  async loadAnomaliesBySystemId(systemId) {
    const sql = 'SELECT a.*, s.name as system_name FROM anomaly a LEFT JOIN system s ON a.system_destination = s.id  WHERE system_id=?;';
    return new Promise((resolve, reject) => {
      database.all(sql, [systemId], (err, rows) => err ? reject(err) : resolve(rows));
    });
  },

  async loadAnomalyById(anomalyId) {
    const sql = 'SELECT * FROM anomaly WHERE id=?;';
    return new Promise((resolve, reject) => {
      database.get(sql, [anomalyId], (err, row) => err ? reject(err) : resolve(row));
    });
  },

  /**
   *
   * @return {Promise<unknown[]>}
   */
  async loadAnomalies() {
    const sql = 'SELECT * FROM anomaly;';
    return new Promise((resolve, reject) => {
      database.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows));
    });
  },

  /**
   * @param systemId {number}
   * @return {Promise<unknown>}
   */
  async loadSystem(systemId) {
    const sql = 'SELECT * FROM system WHERE id=?;';
    return new Promise((resolve, reject) => {
      database.get(sql, [systemId], (err, row) => err ? reject(err) : resolve(row));
    });
  },

  async removeOutdatedAnomalies() {
    // toDo 17.04.22, guille,
  },

  async createFirstLaunch() {
    const result = await this.loadValue('firstLaunch');
    if (result === null) {
      await this.saveValue('firstLaunch', true);
    }
  },

  getOrders(regions, callback, end) {
    let sql = 'SELECT * FROM market_order;';
    if (+regions[0] !== -1) {
      let where = `c.region_id = ${regions[0]}`;
      for (let i = 1; i < regions.length; i++) {
        where += ` OR c.region_id = ${regions[i]}`;
      }

      sql = `SELECT mo.*
             FROM market_order AS mo
                      INNER JOIN system AS s ON s.id = mo.system_id
                      INNER JOIN constellation AS c ON c.id = s.constellation_id
             WHERE ${where};`;
    }
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
      const sql = `SELECT *,
                          (SELECT s.name
                           FROM station AS s
                                    INNER JOIN market_order AS o ON s.id = o.location_id
                           WHERE mo.buyer_id = o.id)   buyer_place,
                          (SELECT s.system_id
                           FROM station AS s
                                    INNER JOIN market_order AS o ON s.id = o.location_id
                           WHERE mo.buyer_id = o.id)   buyer_place_id,
                          (SELECT s2.name
                           FROM station AS s2
                                    INNER JOIN market_order AS o2 ON s2.id = o2.location_id
                           WHERE mo.seller_id = o2.id) seller_place,
                          (SELECT s2.system_id
                           FROM station AS s2
                                    INNER JOIN market_order AS o2 ON s2.id = o2.location_id
                           WHERE mo.seller_id = o2.id) seller_place_id
                   FROM market_opportunity AS mo ${where} LIMIT ?
                   OFFSET ?;`
      database.all(sql, [pageSize, page * pageSize], (err, rows) => {
        err ? reject(err) : resolve(rows);
      });
    });
  },

  async getMarketOpportunitiesCount(moneyLimit) {
    let where = '';
    if (moneyLimit) {
      where = `WHERE sell < ${moneyLimit}`;
    }
    return new Promise((resolve, reject) => {
      database.all(`SELECT count(*) as total
                    FROM market_opportunity ${where};`, [], (err, rows) => {
        err ? reject(err) : resolve(rows[0].total);
      });
    });
  },

  async cleanMarketOpportunity() {
    return new Promise((resolve, reject) => {
      database.run('DELETE FROM market_opportunity;', [], (err) => {
        err ? reject(err) : resolve();
      });
    });
  },

  async saveMarketOpportunities(opportunities = []) {
    return new Promise((resolve, reject) => {
      database.serialize(() => {
        database.run('BEGIN;');

        opportunities.forEach(o => this.saveMarketOpportunity(o));

        database.run('COMMIT;', (err) => {
          err ? reject(err) : resolve();
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
        err ? reject(err) : resolve();
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
          err ? reject(err) : resolve();
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
        err ? reject(err) : resolve();
      });
    });
  }
  ,

  terminateDBConnection() {
    database.close();
  }
}
;
