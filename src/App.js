import {Component} from "react";
import Modal from 'react-modal';
import {Img} from "react-image";
import {NotificationContainer, NotificationManager} from "react-notifications";
import axios from "axios";
import {filter} from "rxjs";

import './App.css';
import 'react-notifications/lib/notifications.css';
import {jwtInterceptor} from "./services/AxiosInterceptor";
import {observable, sendMessage, sendMessageAndWaitResponse} from "./services/MessageHandler";
import Loading from "./Loading/Loading";

jwtInterceptor();

const typeCache = new Map();
const savedElem = new Set();

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
      selectedRegions: [-1],
      savedElements: [],
      fixedStation: false,
      fixedRegionValue: null,
      fixedStationValue: null,
      stations: []
    };
  }

  componentDidMount() {
    observable.pipe(filter(m => m.type === 'table-data-response')).subscribe(async (message) => {
      const opportunities = message.data.filter(d => d['seller_place'] && d['buyer_place']);
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
      this.setState({block: false});
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
    if (pages[pages.length - 1] !== total && total > 0) {
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
    let fixedStation = null;
    if (this.state.fixedStation) {
      fixedStation = this.state.fixedStationValue;
    }
    sendMessage({type: 'calculate-market', regions, fixedStation});
    this.setState({showRegionsModal: false});
  }

  changePage(page) {
    if (page !== this.state.pagination.page) {
      this.setState({block: true});
      sendMessage({type: 'table-data', page: page, moneyLimit: this.getMoneyLimit()});
    }
  }

  changeMoneyLimit() {
    if (this.state.moneyLimit) {
      this.setState({block: true});
      sendMessage({type: 'table-data', page: 1, moneyLimit: this.getMoneyLimit()});
      this.setState({showFilterModal: false});
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

  saveElement(element) {
    let savedElements;
    const hash = this.elementHash(element);
    if (!savedElem.has(hash)) {
      savedElem.add(hash);
      savedElements = [...this.state.savedElements, element];
    } else {
      savedElem.delete(hash);
      savedElements = this.state.savedElements.filter(e => this.elementHash(e) !== hash);
    }
    this.setState({savedElements});
  }

  elementHash(ele) {
    return ele['earning'] + ele['available'] + ele['seller_place'] + ele['buyer_place'] + ele['volume'] + ele['requested'];
  }

  async changeFixedRegion(evt) {
    this.setState({fixedRegionValue: evt.target.value, block: true});
    const data = await sendMessageAndWaitResponse({type: 'get-stations-by-region', regionId: evt.target.value});
    this.setState({block: false, stations: data.stations});
  }

  async copyToClipboard(value) {
    await navigator.clipboard.writeText(value);
    NotificationManager.success(value, 'copy to clipboard', 1000);
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
                <label htmlFor="moneyLimit" style={{fontSize: '14px'}}>max sell cost</label>
                <input style={{maxWidth: '100%'}} type="text"
                       id="moneyLimit"
                       placeholder="money limit"
                       value={this.state.moneyLimit || ''}
                       onChange={evt => this.setState({moneyLimit: evt.target.value})}/>
              </div>
              <div style={{height: '100%'}}/>
              <button onClick={() => this.changeMoneyLimit()}>filter</button>
            </Modal>

            <button className="filter" onClick={() => this.setState({showRegionsModal: true})}>select regions</button>
            <Modal
              isOpen={this.state.showRegionsModal}
              onRequestClose={() => this.setState({showRegionsModal: false})}
              style={{...customStyles.content, width: '400px'}}>
              <h3>Select regions</h3>
              <div style={{display: 'flex', flexDirection: 'row'}}>
                <select multiple
                        style={{width: '50%', minHeight: '300px'}}
                        value={this.state.selectedRegions}
                        onChange={this.handleRegionChange}>
                  {this.state.regions.map((r, index) => (
                    <option value={r.id} key={index}>{r.name}</option>
                  ))}
                </select>
                <div style={{width: '50%', display: 'flex', flexDirection: 'column'}}>
                  <div style={{display: 'flex', flexDirection: 'row'}}>
                    <input type="checkbox" id="enable"
                           checked={this.state.fixedStation}
                           onChange={(evt) => this.setState({fixedStation: evt.target.checked})}/>
                    <label htmlFor="enable">enable fixed station</label>
                  </div>
                  {this.state.fixedStation && <select value={this.state.fixedRegionValue}
                                                      onChange={(evt) => this.changeFixedRegion(evt)}>
                    {this.state.regions.map((r, index) => (
                      <option value={r.id} key={index}>{r.name}</option>
                    ))}
                  </select>}
                  {this.state.fixedStation && <select value={this.state.fixedStationValue}
                                                      onChange={(evt) => this.setState({fixedStationValue: evt.target.value})}>
                    {this.state.stations.map((r, index) => (
                      <option value={r.id} key={index}>{r.name}</option>
                    ))}
                  </select>}
                </div>
              </div>
              <button style={{marginTop: '10px'}} onClick={() => this.calculateOrders()}>calculate opportunities
              </button>
            </Modal>

            <button className="filter" onClick={() => this.setState({showSavedElemModal: true})}>saved elements</button>
            <Modal
              isOpen={this.state.showSavedElemModal}
              onRequestClose={() => this.setState({showSavedElemModal: false})}
              style={{...customStyles.content, width: '100vw', height: '100vh', inset: '0px'}}>
              <h3>Saved elements</h3>
              <table className="subtable">
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
                  <th>actions</th>
                </tr>
                </thead>

                <tbody>
                {this.state.savedElements.map((op, index) => (
                  <tr className="savedItems" key={index} onDoubleClick={() => this.saveElement(op)}>
                    <th onClick={() => this.copyToClipboard(op.name)}>{op.name} {op.iconId &&
                    <img className="icon" src={`https://images.evetech.net/types/${op.iconId}/icon`}
                         alt={op.name}/>}</th>
                    <th onClick={() => this.copyToClipboard(op.volume)}>{op.volume}m&#179;</th>
                    <th onClick={() => this.copyToClipboard(op.earning)}>{op.earning} ISK</th>
                    <th onClick={() => this.copyToClipboard(op.available)}>{op.available}</th>
                    <th onClick={() => this.copyToClipboard(op.requested)}>{op.requested}</th>
                    <th onClick={() => this.copyToClipboard(op.sell)}>{op.sell} ISK</th>
                    <th onClick={() => this.copyToClipboard(op.buy)}>{op.buy} ISK</th>
                    <th onClick={() => this.copyToClipboard(op['seller_place'])}>{op['seller_place']}</th>
                    <th onClick={() => this.copyToClipboard(op['buyer_place'])}>{op['buyer_place']}</th>
                    <th>
                      <button onClick={() => this.saveElement(op)}>{savedElem.has(this.elementHash(op)) ? '-' : '+'}</button>
                    </th>
                  </tr>
                ))}
                </tbody>
              </table>
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
              <th>actions</th>
            </tr>
            </thead>

            <tbody>
            {this.state.opportunities.map((op, index) => (
              <tr className={savedElem.has(this.elementHash(op)) ? 'selected' : 'mainItems'} key={index}>
                <th onClick={() => this.copyToClipboard(op.name)}>{op.name} {(op.iconId) &&
                  <Img className="icon" src={`https://images.evetech.net/types/${op.iconId}/icon`}/>}</th>
                <th onClick={() => this.copyToClipboard(op.volume)}>{op.volume}m&#179;</th>
                <th onClick={() => this.copyToClipboard(op.earning)}>{op.earning} ISK</th>
                <th onClick={() => this.copyToClipboard(op.available)}>{op.available}</th>
                <th onClick={() => this.copyToClipboard(op.requested)}>{op.requested}</th>
                <th onClick={() => this.copyToClipboard(op.sell)}>{op.sell} ISK</th>
                <th onClick={() => this.copyToClipboard(op.buy)}>{op.buy} ISK</th>
                <th onClick={() => this.copyToClipboard(op['seller_place'])}>{op['seller_place']}</th>
                <th onClick={() => this.copyToClipboard(op['buyer_place'])}>{op['buyer_place']}</th>
                <th>
                  <button onClick={() => this.saveElement(op)}>{savedElem.has(this.elementHash(op)) ? '-' : '+'}</button>
                </th>
              </tr>
            ))}
            </tbody>
          </table>

          <div>
            {this.state.pages.map((p, index) => (
              <button className={p === this.state.pagination.page ? 'currentPage' : undefined} key={index}
                      onClick={() => this.changePage(p)}>
                {p}
              </button>
            ))}
          </div>

        </header>
        <NotificationContainer/>
      </div>
    );
  }
}

export default App;
