const dataService = require('./DataService');
const logsService = require("./LogsService");

module.exports = {
  async calculateBestOffers() {
    const bestOffers = await new Promise((resolve, reject) => {
      const maxBuy = new Map();
      const minSell = new Map();
      const typesSet = new Set();
      logsService.log("Query orders to the database");
      dataService.getOrders((err, order) => {
        const type = order['type_id'];
        typesSet.add(type);
        if (order['is_buy_order']) {
          // buy order
          if (maxBuy.has(type)) {
            const tmp = maxBuy.get(type);
            if (tmp['price'] < order['price']) {
              maxBuy.set(type, order);
            }
          } else {
            maxBuy.set(type, order);
          }
        } else {
          // sell order
          if (minSell.has(type)) {
            const tmp = minSell.get(type);
            if (tmp['price'] > order['price']) {
              minSell.set(type, order);
            }
          } else {
            minSell.set(type, order);
          }
        }
      }, () => {
        logsService.log("Calculating best prices");
        let result = [];
        typesSet.forEach(type => {
          const max = maxBuy.get(type);
          const min = minSell.get(type);
          if (max && min) {
            result.push({
              type,
              earning: max.price - min.price,
              min,
              max
            });
          }
        });
        result = result.sort((a, b) => {
          return b.earning - a.earning;
        });

        resolve(result);
      });
    });

    logsService.log("Saving best prices in database");
    await dataService.cleanMarketOpportunity();
    await dataService.saveMarketOpportunities(bestOffers.map(bo => ({
      earning: bo.earning,
      available: bo.min['volume_remain'],
      requested: bo.max['volume_remain'],
      buy: bo.max.price,
      sell: bo.min.price,
      type_id: bo.type,
      buyer_id: bo.max['location_id'],
      seller_id: bo.min['location_id']
    })));
    return bestOffers;
  }
};
