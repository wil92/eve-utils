const url = require("url");
const path = require("path");

const {ipcMain, app} = require("electron");
const moment = require("moment");

const dataService = require("./DataService");
const logsService = require("./LogsService");
const ordersService = require("./AnalyseOrdersService");
const AuthService = require("./AuthService");
const SyncDataService = require('./SyncDataService');
const http = require('./HttpService');
const config = require("./config");

const authService = AuthService(config);
const syncDataService = SyncDataService(authService);
const isDev = !app.isPackaged;

module.exports = (window) => {
  return {
    window,

    registerMessages() {
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

      ipcMain.on('sync-all-data', async () => {
        await this.refreshToken();
        await syncDataService.syncAllData();
        await this.sendTableResult({page: 1});
        logsService.unblock();
        await dataService.saveValue('firstLaunch', false);
        window.webContents.send('in-message', {type: 'load-value-response', value: false, key: 'firstLaunch'});
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
        // fixedStationOrigin, fixedStationDestination
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
        const authData = await dataService.loadObjValue('auth');
        const userInfo = await authService.getUserInfo(authData['access_token']);
        const url = `${config.apiEndpoint}/v2/characters/${userInfo['CharacterID']}/location/`;
        const currentLocation = await http.get(url, authData['access_token']);
        const currentSystem = dataService.getSystemById(currentLocation['solar_system_id']);
        window.webContents.send('in-message', {
          type: 'get-current-location-response', location: {system: currentSystem}, id: data.id
        });
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
      await dataService.saveValue('auth', null);
      await dataService.saveValue('expire', null);
      await this.openLoginPage();
    },

    async openLoginPage() {
      await window.loadURL(authService.requestAuthCode());

      window.webContents.on('did-redirect-navigation', async (event, newUrl) => {
        await authService.requestAccessCode(newUrl);
        await this.openApp();
        await this.updateTokenInUI();
      });
    },

    async openApp() {
      return window.loadURL(
        isDev
          ? 'http://localhost:3000'
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
