const http = require('./HttpService');

module.exports = {
  async saveAnomalies(anomalies) {
    await http.utilsPOST('https://eveutils.guilledev.com/anomalies', anomalies).catch(err => console.error(err));
  },

  async removeAnomalies(anomalies) {
    await http.utilsPOST('https://eveutils.guilledev.com/anomalies/removeList', anomalies).catch(err => console.error(err));
  },

  async getAnomalies() {
    return await http.utilsGET('https://eveutils.guilledev.com/anomalies').catch(err => console.error(err));
  }
};
