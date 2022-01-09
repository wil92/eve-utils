const rp = require('request-promise');

const REQUEST_X_SECOND_LIMIT = 20;
const MS_WAIT_TIME = 1000 / REQUEST_X_SECOND_LIMIT;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  JSON_RESPONSE: 1,
  TEXT_RESPONSE: 2,
  lastRequestTime: 0,

  async get(url, token, responseFormat = 1) {
    await this.requestTimeLimitation();
    return rp({
      method: 'GET',
      url: url,
      headers: {'Authorization': `Bearer ${token}`}
    }).then(res => {
      if (responseFormat === this.JSON_RESPONSE) {
        return JSON.parse(res);
      }
      return res;
    });
  },

  async getWithPagination(url, token) {
    let pages = 1, page = 0;
    let result = [];
    do {
      page++;
      await this.requestTimeLimitation();
      const resValues = await rp({
        method: 'GET',
        url: `${url}?page=${page}`,
        headers: {'Authorization': `Bearer ${token}`},
        resolveWithFullResponse: true
      }).then(res => {
        pages = +res.headers['x-pages'];
        return JSON.parse(res.body);
      });
      result = [...result, ...resValues];
    } while(page < pages);
    return result;
  },

  async requestTimeLimitation() {
    const currentTime = new Date().getTime();
    const waitTime = Math.max(MS_WAIT_TIME - (currentTime - this.lastRequestTime), 0);
    await sleep(waitTime);
    this.lastRequestTime = currentTime;
  }
};
