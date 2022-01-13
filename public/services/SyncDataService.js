const http = require('./HttpService');
const config = require('./config');
const dataService = require('./DataService');
const logsService = require("./LogsService");

module.exports = (authService) => {
  return {
    accessToken: null,
    expire: 0,

    async syncAllData() {
      await this.syncRegions();
      await this.syncConstellations();
      await this.syncSystems();
    },

    async syncRegions() {
      logsService.log('SYNC REGIONS (start)');
      await this.checkCredentials();
      const url = `${config.apiEndpoint}/v1/universe/regions/`;
      const regionsId = await http.get(url, this.accessToken);
      for (let i = 0; i < regionsId.length; i++) {
        await this.checkTokenAndRefresh();
        const url = `${config.apiEndpoint}/v1/universe/regions/${regionsId[i]}`;
        const r = await http.get(url, this.accessToken);
        await dataService.saveRegion(r);
      }
      logsService.log('SYNC REGIONS (end)');
    },

    async syncConstellations() {
      logsService.log('SYNC CONSTELLATIONS (start)');
      await this.checkCredentials();
      const url = `${config.apiEndpoint}/v1/universe/constellations/`;
      const constellationsId = await http.get(url, this.accessToken);
      for (let i = 0; i < constellationsId.length; i++) {
        await this.checkTokenAndRefresh();
        const url = `${config.apiEndpoint}/v1/universe/constellations/${constellationsId[i]}`;
        const c = await http.get(url, this.accessToken);
        await dataService.saveConstellation(c);
      }
      logsService.log('SYNC CONSTELLATIONS (end)');
    },

    async syncSystems() {
      logsService.log('SYNC SYSTEMS (start)');
      await this.checkCredentials();
      const url = `${config.apiEndpoint}/v1/universe/systems/`;
      const systemsId = await http.get(url, this.accessToken);
      for (let i = 0; i < systemsId.length; i++) {
        await this.checkTokenAndRefresh();
        const url = `${config.apiEndpoint}/v4/universe/systems/${systemsId[i]}`;
        const s = await http.get(url, this.accessToken);
        await dataService.saveSystem(s);
        const stations = s['stations'];
        if (stations) {
          for (let j = 0; j < stations.length; j++) {
            await this.syncStation(s['stations'][j]);
          }
        }
      }
      logsService.log('SYNC SYSTEMS (end)');
    },

    async syncStation(stationId) {
      logsService.log('- SYNC STATION (start)');
      await this.checkCredentials();
      const url = `${config.apiEndpoint}/v2/universe/stations/${stationId}`;
      const s = await http.get(url, this.accessToken);
      await dataService.saveStation(s);
      logsService.log('- SYNC STATION (end)');
    },

    async syncOrders() {
      logsService.log('SYNC ORDER (start)');
      await this.checkCredentials();
      await dataService.cleanOrders();
      const regions = await dataService.getRegions();
      for (let i = 0, p = 100 / regions.length; i < regions.length; i++) {
        await this.checkTokenAndRefresh();
        logsService.log(`- SYNC ORDER FROM REGION ${regions[i].id} (start) ${Math.round(i * p * 100) / 100}%`);
        const url = `${config.apiEndpoint}/v1/markets/${regions[i].id}/orders/`;
        const orders = await http.getWithPagination(url, this.accessToken);
        logsService.log(`-- ${orders.length} orders`);
        await dataService.saveOrders(orders);
        logsService.log(`- SYNC ORDER FROM REGION ${regions[i].id} (end)`);
      }
      logsService.log('SYNC ORDER (end)');
    },

    async checkCredentials() {
      if (!this.accessToken) {
        await this.loadCredentials();
      }
    },

    async checkTokenAndRefresh() {
      if (this.expire < new Date().getTime() && await authService.checkExpireToken()) {
        await this.loadCredentials();
      }
    },

    async loadCredentials() {
      const authData = await dataService.loadObjValue('auth');
      this.expire = await dataService.loadNumValue('expire');
      this.accessToken = authData['access_token'];
    },
  };
};
