const http = require('./HttpService');
const config = require('./config');
const dataService = require('./DataService');
const logsService = require("./LogsService");

module.exports = (authService) => {
  return {
    accessToken: null,
    expire: 0,

    async syncOrders(regionsFilter) {
      logsService.log('SYNC ORDER (start)');
      await this.checkCredentials();
      await dataService.cleanOrders();
      await dataService.cleanMarketOpportunity();
      const regions = +regionsFilter[0] === -1 ? await dataService.getRegions() : regionsFilter.map(id => ({id}));
      for (let i = 0, p = 100 / regions.length; i < regions.length; i++) {
        await this.checkTokenAndRefresh();
        logsService.log(`- SYNC ORDER FROM REGION ${regions[i].id} (start) ${Math.round(i * p * 100) / 100}%`);
        const url = `${config.apiEndpoint}/v1/markets/${regions[i].id}/orders/`;
        const orders = await http.getWithPagination(url, this.accessToken);
        logsService.log(`-- ${orders.length} orders`);
        await dataService.saveOrders(orders);
        logsService.log(`- SYNC ORDER FROM REGION ${regions[i].id} (end)`);
      }
      await dataService.saveValue('regions', regions.map(o => o.id));
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
