module.exports = [

  `CREATE TABLE config
   (
       key  TEXT PRIMARY KEY,
       data TEXT
   );`,

  `CREATE TABLE graphic
   (
       id   INTEGER PRIMARY KEY,
       file TEXT
   );`,

  `CREATE TABLE type
   (
       id              INTEGER PRIMARY KEY,
       name            TEXT,
       capacity        REAL,
       description     TEXT,
       mass            REAL,
       packaged_volume REAL,
       published       INTEGER,
       radius          REAL,
       volume          REAL,
       graphic_id      INTEGER,
       FOREIGN KEY (graphic_id) REFERENCES graphic (id)
   );`,

  `CREATE TABLE region
   (
       id          INTEGER PRIMARY KEY,
       name        TEXT,
       description TEXT
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
       constellation_id INTEGER,
       FOREIGN KEY (constellation_id) REFERENCES constellation (id)
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
       system_id     INTEGER,
       location_id   INTEGER,
       FOREIGN KEY (system_id) REFERENCES system (id),
       FOREIGN KEY (location_id) REFERENCES station (id)
   );`
];
