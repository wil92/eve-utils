const http = require('./HttpService');
const config = require('./config');
const dataService = require('./DataService');
const logsService = require("./LogsService");

module.exports = () => {
  return {
    async syncAllData(accessToken) {
      await this.syncRegions(accessToken);
      await this.syncConstellations(accessToken);
      await this.syncSystems(accessToken);
    },

    async syncAllOrders(accessToken) {
      await this.syncOrders(accessToken);
    },

    async syncRegions(accessToken) {
      logsService.log('SYNC REGIONS (start)');
      const url = `${config.apiEndpoint}/v1/universe/regions/`;
      const regionsId = await http.get(url, accessToken);
      for (let i = 0; i < regionsId.length; i++) {
        const url = `${config.apiEndpoint}/v1/universe/regions/${regionsId[i]}`;
        const r = await http.get(url, accessToken);
        await dataService.saveRegion(r);
      }
      logsService.log('SYNC REGIONS (end)');
    },

    async syncConstellations(accessToken) {
      logsService.log('SYNC CONSTELLATIONS (start)');
      const url = `${config.apiEndpoint}/v1/universe/constellations/`;
      const constellationsId = await http.get(url, accessToken);
      for (let i = 0; i < constellationsId.length; i++) {
        const url = `${config.apiEndpoint}/v1/universe/constellations/${constellationsId[i]}`;
        const c = await http.get(url, accessToken);
        await dataService.saveConstellation(c);
      }
      logsService.log('SYNC CONSTELLATIONS (end)');
    },

    async syncSystems(accessToken) {
      logsService.log('SYNC SYSTEMS (start)');
      const url = `${config.apiEndpoint}/v1/universe/systems/`;
      const systemsId = await http.get(url, accessToken);
      for (let i = 0; i < systemsId.length; i++) {
        const url = `${config.apiEndpoint}/v4/universe/systems/${systemsId[i]}`;
        const s = await http.get(url, accessToken);
        await dataService.saveSystem(s);
        const stations = s['stations'];
        if (stations) {
          for (let j = 0; j < stations.length; j++) {
            await this.syncStation(accessToken, s['stations'][j]);
          }
        }
      }
      logsService.log('SYNC SYSTEMS (end)');
    },

    async syncStation(accessToken, stationId) {
      logsService.log('- SYNC STATION (start)');
      const url = `${config.apiEndpoint}/v2/universe/stations/${stationId}`;
      const s = await http.get(url, accessToken);
      await dataService.saveStation(s);
      logsService.log('- SYNC STATION (end)');
    },

    async syncOrders(accessToken) {
      logsService.log('SYNC ORDER (start)');
      await dataService.cleanOrders();
      const regions = await dataService.getRegions();
      for (let i = 0, p = 100 / regions.length; i < regions.length; i++) {
        logsService.log(`- SYNC ORDER FROM REGION ${regions[i].id} (start) ${Math.round(i * p * 100) / 100}%`);
        const url = `${config.apiEndpoint}/v1/markets/${regions[i].id}/orders/`;
        const orders = await http.getWithPagination(url, accessToken);
        logsService.log(`-- ${orders.length} orders`);
        await dataService.saveOrders(orders);
        logsService.log(`- SYNC ORDER FROM REGION ${regions[i].id} (end)`);
      }
      logsService.log('SYNC ORDER (end)');
    },
  };
};
