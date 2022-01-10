import {Component} from "react";
import axios from "axios";

import './App.css';
import {jwtInterceptor} from "./services/AxiosInterceptor";
import {observable, sendMessage, sendMessageAndWaitResponse} from "./services/MessageHandler";
import Loading from "./Loading/Loading";

jwtInterceptor();

const typeCache = new Map();

class App extends Component {

  constructor(props) {
    super(props);

    this.handleRegionChange = this.handleRegionChange.bind(this);

    this.state = {
      opportunities: [],
      pagination: {
        total: 0,
        page: 0
      },
      pages: [],
      moneyLimit: null,
      block: false,
      regions: [],
      selectedRegions: [-1]
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
      } else if (type === 'unblock-response') {
        console.log('assssssss');
        this.setState({block: false});
      }
    });
  }

  componentDidMount() {
    sendMessage({type: 'table-data', page: 1});
    this.setState({block: true});
    this.getRegions();
  }

  async getRegions() {
    const data = await sendMessageAndWaitResponse({type: 'get-regions'});
    this.setState({regions: [{name: "All regions", id: -1}, ...data.regions]});
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

  syncAllData() {
    this.setState({block: true});
    sendMessage({type: 'sync-all-data'});
  }

  syncAllOrders() {
    this.setState({block: true});
    sendMessage({type: 'sync-orders-data'});
  }

  calculateOrders() {
    this.setState({block: true});
    const regions = this.state.selectedRegions.some(v => (v === '-1' || v === -1)) ? [-1] : this.state.selectedRegions;
    sendMessage({type: 'calculate-market', regions});
  }

  changePage(page) {
    this.setState({block: true});
    sendMessage({type: 'table-data', page: page, moneyLimit: this.getMoneyLimit()});
  }

  changeMoneyLimit() {
    if (this.state.moneyLimit) {
      this.setState({block: true});
      sendMessage({type: 'table-data', page: 1, moneyLimit: this.getMoneyLimit()});
    }
  }

  getMoneyLimit() {
    try {
      return +this.state.moneyLimit;
    } catch (ignore) {
    }
    return null;
  }

  handleRegionChange(e) {
    const options = e.target.options;
    const value = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    this.setState({selectedRegions: value});
  }

  render() {
    return (
      <div className="App">
        {this.state.block && <Loading/>}
        <header className="App-header">
          <div>
            <button onClick={() => this.syncAllData()}>sync data</button>
            <button onClick={() => this.syncAllOrders()}>sync orders</button>

            <input className="filter"
                   type="text"
                   placeholder="money limit"
                   value={this.state.moneyLimit || ''}
                   onChange={evt => this.setState({moneyLimit: evt.target.value})}/>
            <button onClick={() => this.changeMoneyLimit()}>&#8227;</button>

            <button className="filter" onClick={() => this.calculateOrders()}>calculate opportunities</button>
            <select name="region" id="region" multiple
                    value={this.state.selectedRegions}
                    onChange={this.handleRegionChange}>
              {this.state.regions.map(r => (
                <option value={r.id}>{r.name}</option>
              ))}
            </select>
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
