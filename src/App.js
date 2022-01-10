import {Component} from "react";
import Modal from 'react-modal';
import axios from "axios";
import {filter} from "rxjs";

import './App.css';
import {jwtInterceptor} from "./services/AxiosInterceptor";
import {observable, sendMessage, sendMessageAndWaitResponse} from "./services/MessageHandler";
import Loading from "./Loading/Loading";

jwtInterceptor();

const typeCache = new Map();

const customStyles = {
  content: {
    width: '200px',
    height: '350px',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
  },
};

Modal.setAppElement('#root');

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
  }

  componentDidMount() {
    observable.pipe(filter(m => m.type === 'table-data-response')).subscribe(async (message) => {
      const opportunities = message.data;
      for (let i = 0; i < opportunities.length; i++) {
        const type = await this.getType(opportunities[i]['type_id']);
        opportunities[i]['volume'] = type['packaged_volume'];
        opportunities[i]['name'] = type['name'];
        opportunities[i]['description'] = type['description'];
        opportunities[i]['iconId'] = type['icon_id'];
      }
      this.setState({
        opportunities,
        pagination: message.pagination,
        pages: this.calculatePagesInPagination(message.pagination.total, message.pagination.page)
      });
    });
    observable.pipe(filter(m => m.type === 'unblock-response')).subscribe(() => {
      this.setState({block: false});
    });

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
    this.setState({showSyncModal: false});
    this.setState({block: true});
    sendMessage({type: 'sync-all-data'});
  }

  syncAllOrders() {
    this.setState({showSyncModal: false});
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

  openSelectRegionsModal() {
    this.setState({showRegionsModal: true});
  }

  render() {
    return (
      <div className="App">
        {this.state.block && <Loading/>}
        <header className="App-header">
          <div>
            <button onClick={() => this.setState({showSyncModal: true})}>sync</button>
            <Modal
              isOpen={this.state.showSyncModal}
              onRequestClose={() => this.setState({showSyncModal: false})}
              style={customStyles}>
              <h3>Sync options</h3>

              <button onClick={() => this.syncAllData()}>sync data</button>
              <button onClick={() => this.syncAllOrders()}>sync orders</button>
            </Modal>

            <button className="filter" onClick={() => this.setState({showFilterModal: true})}>filter</button>
            <Modal
              isOpen={this.state.showFilterModal}
              onRequestClose={() => this.setState({showFilterModal: false})}
              style={customStyles}>
              <h3>Filter options</h3>

              <div style={{display: 'flex', flexDirection: 'column'}}>
                <label htmlFor="moneyLimit" style={{fontSize: '14px'}}>money limit</label>
                <input style={{maxWidth: '100%'}} type="text"
                       id="moneyLimit"
                       placeholder="money limit"
                       value={this.state.moneyLimit || ''}
                       onChange={evt => this.setState({moneyLimit: evt.target.value})}/>
              </div>
              <div style={{height: '100%'}}/>
              <button onClick={() => this.changeMoneyLimit()}>filter</button>
            </Modal>

            <button className="filter" onClick={() => this.openSelectRegionsModal()}>select regions</button>
            <Modal
              isOpen={this.state.showRegionsModal}
              onRequestClose={() => this.setState({showRegionsModal: false})}
              style={customStyles}>
              <h3>Select regions</h3>
              <select name="region" id="region" multiple
                      value={this.state.selectedRegions}
                      onChange={this.handleRegionChange}>
                {this.state.regions.map((r, index) => (
                  <option value={r.id} key={index}>{r.name}</option>
                ))}
              </select>
              <button style={{marginTop: '10px'}} onClick={() => this.calculateOrders()}>calculate opportunities</button>
            </Modal>
          </div>

          <table>
            <thead>
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
            </thead>

            <tbody>
            {this.state.opportunities.map((op, index) => (
              <tr key={index}>
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
            </tbody>
          </table>

          <div>
            {this.state.pages.map((p, index) => (
              <button key={index} onClick={() => this.changePage(p)}>
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
