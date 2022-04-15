const config = require("./config");
const http = require("./HttpService");
const dataService = require("./DataService");

module.exports = {
  async getCurrentLocation() {
    const userInfo = await dataService.loadObjValue('user_info');
    const authData = await dataService.loadObjValue('auth');
    const url = `${config.apiEndpoint}/v2/characters/${userInfo['CharacterID']}/location/`;
    const currentLocation = await http.get(url, authData['access_token']);
    return await dataService.getSystemById(currentLocation['solar_system_id']);
  },

  async getCurrentShip() {
    // toDo 15.04.22, guille,
  },

  async getCurrentStatus() {
    // toDo 15.04.22, guille,
  }
};
