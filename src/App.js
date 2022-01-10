import {Component} from "react";
import axios from "axios";

import './App.css';
import {jwtInterceptor} from "./services/AxiosInterceptor";
import {observable, sendMessage, sendMessageAndWaitResponse} from "./services/MessageHandler";

jwtInterceptor();

const typeCache = new Map();

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      opportunities: [],
      pagination: {
        total: 0,
        page: 0
      },
      pages: [],
      moneyLimit: null
    };

    observable.on(async (type, data) => {
      if (type === 'table-data-response') {
        const opportunities = data.data;
        for (let i = 0; i < opportunities.length; i++) {
          const type = await this.getType(opportunities[i]['type_id']);
          opportunities[i]['volume'] = type['packaged_volume'];
          opportunities[i]['name'] = type['name'];
          opportunities[i]['description'] = type['description'];
          opportunities[i]['iconId'] = type['icon_id'];
        }
        this.setState({
          opportunities,
          pagination: data.pagination,
          pages: this.calculatePagesInPagination(data.pagination.total, data.pagination.page)
        });
      }
    });
  }

  async getType(typeId) {
    if (typeCache.has(typeId)) {
      return typeCache.get(typeId);
    }
    return new Promise(resolve => {
      axios.get(`https://esi.evetech.net/v3/universe/types/${typeId}/`)
        .then(res => {
          typeCache.set(typeId, res.data);
          resolve(res.data);
        })
        .catch(() => resolve({}));
    });
  }

  calculatePagesInPagination(total, page) {
    const shift = 3;
    const pages = [page];
    for (let i = page + 1; i <= Math.min(total, page + shift); i++) {
      pages.push(i);
    }
    for (let i = page - 1; i > Math.max(0, page - shift); i--) {
      pages.unshift(i);
    }
    if (pages[0] !== 1) {
      pages.unshift(1);
    }
    if (pages[pages.length - 1] !== total) {
      pages.push(total);
    }
    return pages;
  }

  componentDidMount() {
    sendMessage({type: 'table-data', page: 1});
  }

  async syncAllData() {
    await sendMessageAndWaitResponse({type: 'sync-all-data'});
  }

  async syncAllOrders() {
    await sendMessageAndWaitResponse({type: 'sync-orders-data'});
  }

  async calculateOrders() {
    await sendMessageAndWaitResponse({type: 'calculate-market'});
  }

  changePage(page) {
    sendMessage({type: 'table-data', page: page, moneyLimit: this.state.moneyLimit});
  }

  changeMoneyLimit() {
    if (this.state.moneyLimit) {
      sendMessage({type: 'table-data', page: 1, moneyLimit: this.state.moneyLimit});
    }
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div>
            <button onClick={() => this.syncAllData()}>sync data</button>
            <button onClick={() => this.syncAllOrders()}>sync orders</button>
            <button onClick={() => this.calculateOrders()}>calculate opportunities</button>

            <input className="filter"
                   type="text"
                   placeholder="money limit"
                   value={this.state.moneyLimit || ''}
                   onChange={evt => this.setState({moneyLimit: evt.target.value})}/>
            <button onClick={() => this.changeMoneyLimit()}>&#8227;</button>
          </div>

          <table>
            <tr>
              <th>Name</th>
              <th>Earning</th>
              <th>Units available</th>
              <th>Units requested</th>
              <th>Buy cost</th>
              <th>Sell cost</th>
              <th>Volume</th>
              <th>Seller station</th>
              <th>Buyer station</th>
            </tr>

            {this.state.opportunities.map(op => (
              <tr>
                <th>{op.name} {op.iconId &&
                <img className="icon" src={`https://images.evetech.net/types/${op.iconId}/icon`} alt={op.name}/>}</th>
                <th>{op.earning} ISK</th>
                <th>{op.available}</th>
                <th>{op.requested}</th>
                <th>{op.buy} ISK</th>
                <th>{op.sell} ISK</th>
                <th>{op.volume}m&#179;</th>
                <th>{op['seller_place']}</th>
                <th>{op['buyer_place']}</th>
              </tr>
            ))}
          </table>

          <div>
            {this.state.pages.map(p => (
              <button onClick={() => this.changePage(p)}>
                {p}
              </button>
            ))}
          </div>

        </header>
      </div>
    );
  }
}

export default App;
