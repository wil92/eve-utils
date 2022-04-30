const http = require('./HttpService');

module.exports = {
  async saveAnomalies(anomalies) {
    await http.utilsPOST('http://localhost:4538/anomalies', anomalies).catch(err => console.error(err));
  },

  async removeAnomalies(anomalies) {
    await http.utilsPOST('http://localhost:4538/anomalies/removeList', anomalies).catch(err => console.error(err));
  },

  async getAnomalies() {
    return await http.utilsGET('http://localhost:4538/anomalies').catch(err => console.error(err));
  }
};
