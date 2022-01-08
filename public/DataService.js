const fs = require('fs');

const dataName = 'data.db';

module.exports = () => {

  return {
    data: {},

    loadValue(key) {
      return this.data[key];
    },

    saveValue(key, value) {
      this.data[key] = value;
      this.saveData()
    },

    loadData() {
      if (fs.existsSync(dataName)) {
        try {
          this.data = JSON.parse(fs.readFileSync(dataName, {encoding: "utf8"}));
        } catch (e) {
          console.error(e);
          this.data = {};
        }
      } else {
        this.data = {};
      }
    },

    saveData() {
      if (this.data) {
        fs.writeFileSync(dataName, JSON.stringify(this.data), {encoding: "utf8"});
      }
    }
  };
};
