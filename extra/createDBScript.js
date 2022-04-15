module.exports = [

  `CREATE TABLE config
   (
       key  TEXT PRIMARY KEY,
       data TEXT
   );`,

  `CREATE TABLE eve_type
   (
       id          INTEGER PRIMARY KEY,
       name        TEXT,
       description TEXT,
       capacity    REAL,
       mass        REAL,
       volume      REAL
   );`,

  `CREATE TABLE region
   (
       id   INTEGER PRIMARY KEY,
       name TEXT
   );`,

  `CREATE TABLE constellation
   (
       id        INTEGER PRIMARY KEY,
       name      TEXT,
       region_id INTEGER,
       FOREIGN KEY (region_id) REFERENCES region (id)
   );`,

  `CREATE TABLE system
   (
       id               INTEGER PRIMARY KEY,
       name             TEXT,
       security_status  REAL,
       security_class   TEXT,
       system_class     TEXT,
       constellation_id INTEGER,
       region_id        INTEGER,
       FOREIGN KEY (constellation_id) REFERENCES constellation (id),
       FOREIGN KEY (region_id) REFERENCES region (id)
   );`,

  `CREATE TABLE station
   (
       id                         INTEGER PRIMARY KEY,
       name                       TEXT,
       office_rental_cost         REAL,
       reprocessing_efficiency    REAL,
       reprocessing_stations_take REAL,
       system_id                  INTEGER,
       type_id                    INTEGER,
       FOREIGN KEY (system_id) REFERENCES system (id),
       FOREIGN KEY (type_id) REFERENCES type (id)
   );`,

  `CREATE TABLE planet
   (
       id        INTEGER PRIMARY KEY,
       name      TEXT,
       system_id INTEGER,
       type_id   INTEGER,
       FOREIGN KEY (system_id) REFERENCES system (id),
       FOREIGN KEY (type_id) REFERENCES type (id)
   );`,

  `CREATE TABLE stargate
   (
       id                   INTEGER PRIMARY KEY,
       name                 TEXT,
       stargate_destination INTEGER,
       system_destination   INTEGER,
       system_id            INTEGER,
       type_id              INTEGER,
       FOREIGN KEY (system_id) REFERENCES system (id),
       FOREIGN KEY (type_id) REFERENCES type (id)
   );`,

  `CREATE TABLE market_order
   (
       id            INTEGER PRIMARY KEY,
       duration      INTEGER,
       is_buy_order  INTEGER,
       issued        TEXT,
       min_volume    INTEGER,
       price         REAL,
       range         TEXT,
       volume_remain INTEGER,
       volume_total  INTEGER,
       type_id       INTEGER,
       system_id     INTEGER,
       location_id   INTEGER,
       FOREIGN KEY (type_id) REFERENCES eve_type (id),
       FOREIGN KEY (system_id) REFERENCES system (id),
       FOREIGN KEY (location_id) REFERENCES station (id)
   );`,

  `CREATE TABLE market_opportunity
   (
       id        INTEGER PRIMARY KEY AUTOINCREMENT,
       earning   REAL,
       available INTEGER,
       requested INTEGER,
       buy       REAL,
       sell      REAL,
       type_id   INTEGER,
       buyer_id  INTEGER,
       seller_id INTEGER,
       FOREIGN KEY (type_id) REFERENCES eve_type (id),
       FOREIGN KEY (buyer_id) REFERENCES market_order (id),
       FOREIGN KEY (seller_id) REFERENCES market_order (id)
   );`,

  `CREATE TABLE wormhole
   (
       id                 INTEGER PRIMARY KEY AUTOINCREMENT,
       life               TEXT,
       mass               TEXT,
       system_destination INTEGER,
       FOREIGN KEY (system_destination) REFERENCES system (id)
   );`,

  `CREATE TABLE anomaly
   (
       anomaly_id  TEXT NOT NULL,
       name        TEXT,
       type        TEXT,
       expiration  INTEGER,
       system_id   INTEGER NOT NULL,
       wormhole_id INTEGER,
       PRIMARY KEY (anomaly_id, system_id),
       FOREIGN KEY (system_id) REFERENCES system (id),
       FOREIGN KEY (wormhole_id) REFERENCES wormhole (id)
   );`

];
