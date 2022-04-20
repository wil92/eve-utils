const url = require("url");
const path = require("path");

const {ipcMain, app} = require("electron");
const moment = require("moment");
const {filter} = require("rxjs");

const dataService = require("./DataService");
const logsService = require("./LogsService");
const ordersService = require("./AnalyseOrdersService");
const locationService = require('./LocationService');
const AuthService = require("./AuthService");
const SyncDataService = require('./SyncDataService');
const periodService = require("./PeriodicTasksService");
const config = require("./config");

const authService = AuthService(config);
const syncDataService = SyncDataService(authService);
const isDev = !app.isPackaged;

module.exports = (window) => {
  return {
    window,

    registerMessages() {
      periodService.getObservable().pipe(
        filter(val => val % 2 === 0)
      ).subscribe(() => {
        this.refreshToken().then(() => this.getCurrentLocation());
      });

      periodService.getObservable().pipe(
        filter(val => val % 10 === 0)
      ).subscribe(() => {
        dataService.removeExpiredAnomalies().then();
      });

      ipcMain.on('refresh-token', async (evt, data) => {
        await this.refreshToken(data.id);
      });

      ipcMain.on('logout', async () => {
        await this.logout();
      });

      ipcMain.on('save-value', async (event, data) => {
        await dataService.saveValue(data.key, data.value);
        window.webContents.send('in-message', {type: 'save-value-response', id: data.id});
      });

      ipcMain.on('load-value', async (event, data) => {
        const value = await dataService.loadValue(data.key);
        window.webContents.send('in-message', {type: 'load-value-response', value, key: data.key, id: data.id});
      });

      ipcMain.on('remove-opportunity', async (event, data) => {
        await dataService.removeOpportunity(data['opportunityId']);
        window.webContents.send('in-message', {type: 'remove-opportunity-response', id: data.id});
      });

      ipcMain.on('sync-orders-data', async (event, data) => {
        await syncDataService.syncOrders(data.regions);
        await this.sendTableResult({page: 1});
        window.webContents.send('in-message', {type: 'refresh-regions-response'});

        // updating lastSync date
        const lastSync = moment().format('MMMM Do YYYY, h:mm:ss a');
        await dataService.saveValue('lastSync', lastSync);
        window.webContents.send('in-message', {type: 'load-value-response', value: lastSync, key: 'lastSync'});

        logsService.unblock();
      });

      ipcMain.on('calculate-market', async (event, data) => {
        logsService.log('Start market calculation');
        let fixedStationOrigin;
        if (data.fixedStationOrigin) {
          fixedStationOrigin = +data.fixedStationOrigin;
        }
        const fixedStationDestination = data.fixedStationDestination && +data.fixedStationDestination;
        await ordersService.calculateBestOffers(data.regions, fixedStationOrigin, fixedStationDestination);
        await this.sendTableResult({page: 1});
      });

      ipcMain.on('table-data', async (event, data) => {
        await this.sendTableResult(data);
      });

      ipcMain.on('get-regions', async (event, data) => {
        const regions = await dataService.getAllRegions();
        window.webContents.send('in-message', {type: 'get-regions-response', regions, id: data.id});
      });

      ipcMain.on('get-current-location', async (event, data) => {
        await this.getCurrentLocation(data.id);
      });

      ipcMain.on('save-anomalies', async (event, data) => {
        await dataService.saveAnomaliesAndRemoveMissing(data.anomalies, data.systemId);
        await this.sendSystemAnomalies(data.systemId, data.id);
      });

      ipcMain.on('remove-anomalies', async (event, data) => {
        for (let i = 0; i < data.anomalies.length; i++) {
          await dataService.removeAnomalyById(data.anomalies[i], data.systemId);
        }
        await this.sendSystemAnomalies(data.systemId, data.id);
      });

      ipcMain.on('update-anomaly-destination', async (event, data) => {
        const destinationSys = await dataService.getSystemByName(data.destinationName);
        const anomaly = await dataService.loadAnomalyById(data.anomalyId);
        if (anomaly) {
          await dataService.saveAnomaly(anomaly, anomaly['system_id'], destinationSys && destinationSys.id);

          window.webContents.send('in-message', {type: 'update-anomaly-destination-response', id: data.id});
        }
      });

      ipcMain.on('load-anomalies', async (event, data) => {
        await this.sendSystemAnomalies(data.systemId);
      });

      ipcMain.on('load-system', async (event, data) => {
        const system = await dataService.loadSystem(data.systemId);
        window.webContents.send('in-message', {type: 'load-system-response', system, id: data.id});
      });

      ipcMain.on('load-tree', async (event, data) => {
        await this.sendAnomaliesTree(data.systemId);
      });

      ipcMain.on('get-security-status', async (event, data) => {
        const securityStatus = await dataService.getSecurityStatus(data.route);
        window.webContents.send('in-message', {type: 'get-security-status-response', securityStatus, id: data.id});
      });

      ipcMain.on('get-stations-by-region', async (event, data) => {
        const stations = await dataService.getAllStationsByRegionId(data.regionId);
        window.webContents.send('in-message', {type: 'get-stations-by-region-response', stations, id: data.id});
      });

      ipcMain.on('user-info', async (event, data) => {
        const authData = await dataService.loadObjValue('auth');
        await this.refreshToken();
        const userInfo = await authService.getUserInfo(authData['access_token']);
        window.webContents.send('in-message', {type: 'user-info-response', userInfo, id: data.id});
      });
    },

    /**
     * @param systemId {number}
     * @param responseId
     * @return {Promise<void>}
     */
    async sendSystemAnomalies(systemId, responseId = null) {
      const anomalies = await dataService.loadAnomaliesBySystemId(systemId);
      window.webContents.send('in-message', {type: 'load-anomalies-response', anomalies, id: responseId});
    },

    /**
     * @param systemId {number}
     * @param responseId {number|null}
     * @return {Promise<void>}
     */
    async sendAnomaliesTree(systemId, responseId= null) {
      const anomalies = await dataService.loadAnomalies();
      const queue = [systemId];
      const flags = new Set();
      flags.add(systemId);
      const tree = [];

      while (queue.length > 0) {
        const sid = queue.shift();
        const node = {wormholes: [], system: await dataService.getSystemById(sid)};

        anomalies
          .filter(a => a['system_id'] === sid && a['type'] === 'Wormhole')
          .forEach(a => {
            if (a['system_destination'] && !flags.has(a['system_destination'])) {
              flags.add(a['system_destination']);
              queue.push(a['system_destination']);
            }
            node.wormholes.push(a);
          });

        tree.push(node);
      }

      window.webContents.send('in-message', {
        type: 'load-tree-response', tree, id: responseId
      });
    },

    async getCurrentLocation(responseId) {
      const currentSystem = await locationService.getCurrentLocation();
      window.webContents.send('in-message', {
        type: 'get-current-location-response', location: {system: currentSystem}, id: responseId
      });
    },

    async sendTableResult(data) {
      const page = data.page ? data.page - 1 : 0;
      const result = await dataService.getMarketOpportunities(page, 20, data.moneyLimit);
      const count = await dataService.getMarketOpportunitiesCount(data.moneyLimit);
      window.webContents.send('in-message', {
        type: 'table-data-response',
        data: result,
        pagination: {total: Math.floor(count / 20) + (count % 20 === 0 ? 0 : 1), page: data.page || 0}
      });
    },

    async refreshToken(id = null) {
      try {
        await authService.checkExpireToken()
        if (id) {
          await this.updateTokenInUI(id);
        }
      } catch (e) {
        console.error(e);
        await this.logout();
      }
    },

    async logout() {
      periodService.stopTimer();
      await dataService.saveValue('auth', null);
      await dataService.saveValue('expire', null);
      await dataService.saveValue('user_info', null);
      await this.openLoginPage();
    },

    async openLoginPage() {
      await window.loadURL(authService.requestAuthCode());

      window.webContents.on('did-redirect-navigation', async (event, newUrl) => {
        await authService.requestAccessCode(newUrl);
        await this.getUserInfo();
        await this.openApp();
        await this.updateTokenInUI();
      });
    },

    async getUserInfo() {
      const authData = await dataService.loadObjValue('auth');
      const userInfo = await authService.getUserInfo(authData['access_token']);
      await dataService.saveValue('user_info', userInfo);
    },

    async openApp() {
      periodService.startTimer();
      return window.loadURL(
        isDev
          ? `http://localhost:${process.env.PORT || 3000}`
          : url.format({
            pathname: path.join(__dirname, '../index.html'),
            protocol: 'file',
            slashes: true
          })
      );
    },

    async updateTokenInUI(id = null) {
      const expire = await dataService.loadNumValue('expire') || 0;
      const auth = await dataService.loadObjValue('auth');
      window.webContents.send('in-message', {type: 'refresh-token-response', auth, expire, id});
    }
  };
};
