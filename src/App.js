import {Component} from "react";
import Modal from 'react-modal';
import {Img} from "react-image";
import Select from "react-select";
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
    position: 'relative',
    width: '200px',
    height: '350px',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
  },
};

const selectStyles = {
  option: (provided) => ({...provided, fontSize: '14px',}),
  input: (provided) => ({...provided, fontSize: '14px',}),
  control: (provided) => ({...provided, fontSize: '14px', minHeight: '30px'}),
  singleValue: (provided) => ({...provided, fontSize: '14px'}),
  dropdownIndicator: (provided) => ({...provided, padding: '3px'}),
  clearIndicator: (provided) => ({...provided, padding: '3px'})
}

Modal.setAppElement('#root');

class App extends Component {

  constructor(props) {
    super(props);

    this.handleRegionChange = this.handleRegionChange.bind(this);

    this.state = {
      opportunities: [],
      pagination: {
        total: 0,
        page: 1
      },
      pages: [],
      moneyLimit: null,
      block: false,
      regions: [],
      currentRegions: new Set(),
      selectedRegions: [-1],
      savedElements: [],
      // origin station
      fixedStation: false,
      fixedRegionValue: '-1',
      fixedStationValue: null,
      stations: [],
      // destination station
      fixedStationDestination: false,
      fixedRegionDestinationValue: '-1',
      fixedStationDestinationValue: null,
      stationsDestination: [],

      lastSync: null
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
        opportunities[i].earning = Math.round(opportunities[i].earning * 100) / 100;
        opportunities[i].investment = Math.round(opportunities[i].sell * Math.min(opportunities[i].available, opportunities[i].requested) * 100) / 100;

        // calculate security
        const route = await this.getRoute(opportunities[i]['seller_place_id'], opportunities[i]['buyer_place_id']);
        const {securityStatus} = await sendMessageAndWaitResponse({type: 'get-security-status', route});
        opportunities[i].jumps = route.length;
        opportunities[i].securityStatus = Math.round(securityStatus * 100) / 100;
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
    observable.pipe(filter(m => m.type === 'refresh-regions-response')).subscribe(() => {
      this.getRegions();
    });
    observable.pipe(filter(m => m.type === 'load-value-response')).subscribe((data) => {
      if (data.key === 'lastSync' && data.value) {
        this.setState({lastSync: data.value});
      }
    });

    sendMessage({type: 'table-data', page: this.state.pagination.page});
    sendMessage({type: 'load-value', key: 'lastSync'});
    this.setState({block: true});

    this.getRegions();
    this.loadSavedElements();
  }

  async getRegions() {
    const data = await sendMessageAndWaitResponse({type: 'get-regions'});
    let regionsIds = (await sendMessageAndWaitResponse({type: 'load-value', key: 'regions'})).value;
    regionsIds = typeof regionsIds === "string" ? JSON.parse(regionsIds) : [];
    const currentRegions = new Set();
    regionsIds.forEach(r => currentRegions.add(+r));
    this.setState({
      regions: [{label: "All regions", value: -1}, ...data.regions.map(r => ({
        label: r.name,
        value: r.id
      }))], currentRegions
    });
  }

  async loadSavedElements() {
    const value = (await sendMessageAndWaitResponse({type: 'load-value', key: 'savedElements'})).value;
    const savedElements = value ? JSON.parse(value) : [];
    savedElements.forEach(e => savedElem.add(this.elementHash(e)));
    this.setState({savedElements});
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

  async getRoute(origin, destination) {
    return new Promise(resolve => {
      // toDo 13.01.22, guille, add toute to config file
      axios.get(`https://esi.evetech.net/v1/route/${origin}/${destination}/`)
        .then(res => {
          resolve(res.data);
        })
        .catch(() => resolve([]));
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
    const regions = this.state.selectedRegions.some(v => (v === '-1' || v === -1)) ? [-1] : this.state.selectedRegions;
    sendMessage({type: 'sync-orders-data', regions});
  }

  calculateOrders() {
    this.setState({block: true});
    const regions = this.state.selectedRegions.some(v => (v === '-1' || v === -1)) ? [-1] : this.state.selectedRegions;
    let fixedStationOrigin = null;
    if (this.state.fixedStation) {
      fixedStationOrigin = this.state.fixedStationValue;
    }
    let fixedStationDestination = null;
    if (this.state.fixedStationDestination) {
      fixedStationDestination = this.state.fixedStationDestinationValue;
    }
    sendMessage({
      type: 'calculate-market',
      regions,
      fixedStationOrigin,
      fixedStationDestination
    });
    this.setState({showRegionsModal: false, moneyLimit: null});
  }

  async deleteOpportunity(opportunityId) {
    this.setState({block: true});
    await sendMessageAndWaitResponse({type: 'remove-opportunity', opportunityId});
    sendMessage({type: 'table-data', page: this.state.pagination.page, moneyLimit: this.getMoneyLimit()});
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

  handleRegionChange(regions) {
    this.setState({selectedRegions: regions.map(r => r.value)});
  }

  async saveElement(element) {
    let savedElements;
    const hash = this.elementHash(element);
    if (!savedElem.has(hash)) {
      this.setState({block: true});
      savedElem.add(hash);
      savedElements = [...this.state.savedElements, {...element}];
      this.setState({block: false});
      NotificationManager.success(element.name, 'Opportunity saved', 3000);
    } else {
      savedElem.delete(hash);
      savedElements = this.state.savedElements.filter(e => this.elementHash(e) !== hash);
      NotificationManager.success(element.name, 'Removed from saved', 3000);
    }
    sendMessage({type: 'save-value', key: 'savedElements', value: JSON.stringify(savedElements)});
    this.setState({savedElements});
  }

  async applyElement(element) {
    const savedElements = this.state.savedElements.map(el => {
      if (this.elementHash(el) === this.elementHash(element)) {
        return {...el, applied: !el.applied};
      }
      return el;
    });
    this.setState({savedElements});
    sendMessage({type: 'save-value', key: 'savedElements', value: JSON.stringify(savedElements)});
  }

  elementHash(ele) {
    return ele['earning'] + ele['available'] + ele['seller_place'] + ele['buyer_place'] + ele['volume'] + ele['requested'];
  }

  async changeFixedRegion(region) {
    this.setState({fixedRegionValue: region.value, block: true});
    const data = await sendMessageAndWaitResponse({type: 'get-stations-by-region', regionId: region.value});
    this.setState({
      block: false,
      stations: data.stations.map(s => ({value: s.id, label: s.name})),
      fixedStationValue: null
    });
  }

  async changeFixedRegionDestination(region) {
    this.setState({fixedRegionDestinationValue: region.value, block: true});
    const data = await sendMessageAndWaitResponse({type: 'get-stations-by-region', regionId: region.value});
    this.setState({
      block: false,
      stationsDestination: data.stations.map(s => ({value: s.id, label: s.name})),
      fixedStationDestinationValue: null
    });
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
          <div style={{display: 'flex', flexDirection: 'row', margin: '0 20px', minWidth: 'calc(100% - 40px)'}}>
            {this.state.lastSync &&
            <span style={{
              fontSize: '15px',
              whiteSpace: 'nowrap',
              marginTop: '10px'
            }}>Last sync ({this.state.lastSync})</span>}

            <div style={{width: '100%'}}/>

            <button className="Button" onClick={() => this.setState({showSyncModal: true})}>sync</button>
            <Modal
              isOpen={this.state.showSyncModal}
              onRequestClose={() => this.setState({showSyncModal: false})}
              style={{content: {...customStyles.content, width: '300px', height: '450px', overflow: 'hidden'}}}>
              <button className="CloseButton"
                      onClick={() => this.setState({showSyncModal: false})}>x
              </button>
              <h3>Sync options</h3>
              <div style={{display: 'flex', flexDirection: 'column'}}>
                <label htmlFor="selectRegionsToGetOrders">Select regions to get orders</label>
                <Select
                  styles={selectStyles}
                  id="selectRegionsToGetOrders"
                  className="SelectRegions"
                  isSearchable={true}
                  menuPortalTarget={document.body}
                  isMulti
                  name="Available regions"
                  defaultValue={this.state.regions.filter(r => this.state.selectedRegions.some(sr => sr === r.value))}
                  onChange={(regions) => this.handleRegionChange(regions)}
                  options={this.state.regions}
                />
                <button className="Button" style={{margin: '10px 0', width: '100%'}}
                        onClick={() => this.syncAllOrders()}>sync orders
                </button>
              </div>
              <div style={{height: '1px', width: '100%', backgroundColor: 'hsl(0, 0%, 80%)', margin: '10px 0'}}/>
              <div>
                <button className="Button" style={{margin: '10px 0', width: '100%'}}
                        onClick={() => this.syncAllData()}>sync all data
                </button>
              </div>
            </Modal>

            <button className="Button" onClick={() => this.setState({showRegionsModal: true})}>select regions</button>
            <Modal
              isOpen={this.state.showRegionsModal}
              onRequestClose={() => this.setState({showRegionsModal: false})}
              style={{content: {...customStyles.content, width: '300px', height: '450px'}}}>
              <button className="CloseButton"
                      onClick={() => this.setState({showRegionsModal: false})}>x
              </button>
              <h3>Calculate best opportunities</h3>
              <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div style={{display: 'flex', flexDirection: 'row'}}>
                  <input type="checkbox" id="enableOrigin"
                         checked={this.state.fixedStation}
                         onChange={(evt) => this.setState({fixedStation: evt.target.checked})}/>
                  <label htmlFor="enableOrigin" style={{margin: 0}}>Select origin station</label>
                </div>
                {this.state.fixedStation && <label htmlFor="RegionSelect">Select region</label>}
                {this.state.fixedStation &&
                <Select
                  styles={selectStyles}
                  id="RegionSelect"
                  className="RegionSelect"
                  menuPortalTarget={document.body}
                  isSearchable={true}
                  name="fixed region"
                  defaultValue={this.state.regions.find(s => s.value === this.state.fixedRegionValue)}
                  onChange={(evt) => this.changeFixedRegion(evt)}
                  options={this.state.regions.filter(r => this.state.currentRegions.has(r.value))}
                />
                }
                {this.state.fixedStation && <label htmlFor="StationSelect">Select station</label>}
                {this.state.fixedStation &&
                <Select
                  styles={selectStyles}
                  id="StationSelect"
                  className="StationSelect"
                  menuPortalTarget={document.body}
                  defaultValue={this.state.stations.find(s => s.value === this.state.fixedStationValue)}
                  isSearchable={true}
                  name="fixed station"
                  onChange={(station) => this.setState({fixedStationValue: station.value})}
                  options={this.state.stations}
                />
                }

                <div style={{
                  height: '1px',
                  minHeight: '1px',
                  width: '100%',
                  backgroundColor: 'hsl(0, 0%, 80%)',
                  margin: '10px 0'
                }}/>

                <div style={{display: 'flex', flexDirection: 'row'}}>
                  <input type="checkbox" id="enableDestination"
                         checked={this.state.fixedStationDestination}
                         onChange={(evt) => this.setState({fixedStationDestination: evt.target.checked})}/>
                  <label htmlFor="enableDestination" style={{margin: 0}}>Select destination station</label>
                </div>
                {this.state.fixedStationDestination && <label htmlFor="RegionSelect">Select region</label>}
                {this.state.fixedStationDestination &&
                <Select
                  styles={selectStyles}
                  id="RegionSelect"
                  className="RegionSelect"
                  menuPortalTarget={document.body}
                  isSearchable={true}
                  name="fixed region"
                  defaultValue={this.state.regions.find(s => s.value === this.state.fixedRegionDestinationValue)}
                  onChange={(evt) => this.changeFixedRegionDestination(evt)}
                  options={this.state.regions.filter(r => this.state.currentRegions.has(r.value))}
                />
                }
                {this.state.fixedStationDestination && <label htmlFor="StationSelect">Select station</label>}
                {this.state.fixedStationDestination &&
                <Select
                  styles={selectStyles}
                  id="StationSelect"
                  className="StationSelect"
                  menuPortalTarget={document.body}
                  defaultValue={this.state.stationsDestination.find(s => s.value === this.state.fixedStationDestinationValue)}
                  isSearchable={true}
                  name="fixed station"
                  onChange={(station) => this.setState({fixedStationDestinationValue: station.value})}
                  options={this.state.stationsDestination}
                />
                }

                <div style={{
                  height: '1px',
                  minHeight: '1px',
                  width: '100%',
                  backgroundColor: 'hsl(0, 0%, 80%)',
                  margin: '10px 0'
                }}/>

                <label htmlFor="selectRegions">Select regions</label>
                <Select
                  styles={selectStyles}
                  id="selectRegions"
                  menuPortalTarget={document.body}
                  className="SelectRegions"
                  isSearchable={true}
                  isMulti
                  name="Available regions"
                  defaultValue={this.state.regions.filter(r => this.state.selectedRegions.some(sr => sr === r.value))}
                  onChange={(regions) => this.handleRegionChange(regions)}
                  options={this.state.regions.filter(r => +r.value === -1 || this.state.currentRegions.has(r.value))}
                />

                <div style={{height: '100%'}}/>

                <button className="Button" style={{margin: '10px 0 0 0'}}
                        onClick={() => this.calculateOrders()}>calculate opportunities
                </button>
              </div>
            </Modal>

            <button className="Button" onClick={() => this.setState({showSavedElemModal: true})}>saved elements</button>
            <Modal
              isOpen={this.state.showSavedElemModal}
              onRequestClose={() => this.setState({showSavedElemModal: false})}
              style={{
                content: {
                  ...customStyles.content,
                  width: 'calc(100vw - 40px)',
                  height: '100vh',
                  inset: 0,
                  transform: 'none',
                  overflow: 'hidden'
                }
              }}>
              <button className="CloseButton"
                      onClick={() => this.setState({showSavedElemModal: false})}>x
              </button>
              <h3>Saved elements</h3>
              <table className="subtable">
                <thead>
                <tr>
                  <th>Name</th>
                  <th>Volume</th>
                  <th
                    title={this.state.savedElements.reduce((p, v) => p + v.earning, 0).toLocaleString()}>Profit&#182;</th>
                  <th>Investment</th>
                  <th>available/requested</th>
                  <th>Sell cost</th>
                  <th>Buy cost</th>
                  <th>Seller station</th>
                  <th>Buyer station</th>
                  <th>Jumps</th>
                  <th>Security</th>
                  <th>actions</th>
                </tr>
                </thead>

                <tbody>
                {this.state.savedElements.map((op, index) => (
                  <tr className={'savedItems ' + (op.applied ? 'applied' : '')} key={index}>
                    <th title={`seller_id:${op['seller_id']} / buyer_id:${op['buyer_id']}`}
                        onDoubleClick={() => this.copyToClipboard(op.name)}>{op.name} {op.iconId &&
                    <Img className="icon" src={`https://images.evetech.net/types/${op.iconId}/icon`}/>}</th>
                    <th
                      onDoubleClick={() => this.copyToClipboard(op.volume)}>{op.volume}m&#179;/{Math.round(op.volume * Math.min(op.available, op.requested) * 100) / 100}m&#179;</th>
                    <th className="thinline"
                        onDoubleClick={() => this.copyToClipboard(op.earning)}>&asymp; {op.earning.toLocaleString()} ISK
                    </th>
                    <th className="thinline"
                        onDoubleClick={() => this.copyToClipboard(op.investment)}>{op.investment.toLocaleString()} ISK
                    </th>
                    <th
                      onDoubleClick={() => this.copyToClipboard(Math.min(op.requested, op.available))}>{op.available}/{op.requested}</th>
                    <th className="thinline"
                        onDoubleClick={() => this.copyToClipboard(op.sell)}>{op.sell.toLocaleString()} ISK
                    </th>
                    <th className="thinline"
                        onDoubleClick={() => this.copyToClipboard(op.buy)}>{op.buy.toLocaleString()} ISK
                    </th>
                    <th title={op['seller_place_id']}
                        onDoubleClick={() => this.copyToClipboard(op['seller_place'])}>{op['seller_place']}</th>
                    <th title={op['buyer_place_id']}
                        onDoubleClick={() => this.copyToClipboard(op['buyer_place'])}>{op['buyer_place']}</th>
                    <th onDoubleClick={() => this.copyToClipboard(op.jumps)}>{op.jumps}</th>
                    <th onDoubleClick={() => this.copyToClipboard(op.securityStatus)}>{op.securityStatus}</th>
                    <th className="thinline">
                      <button onClick={() => this.applyElement(op)}
                              title={op.applied ? 'unapply' : 'apply'}>{op.applied ? <span>&#9746;</span> :
                        <span>&#9745;</span>}</button>
                      <button onClick={() => this.saveElement(op)} title="unsave">-</button>
                    </th>
                  </tr>
                ))}
                </tbody>
              </table>
            </Modal>
          </div>

          <table style={{margin: '10px', minWidth: 'calc(100% - 40px)'}}>
            <thead>
            <tr>
              <th>Name</th>
              <th>Volume/Total</th>
              <th>Profit</th>
              <th>Investment</th>
              <th>available/requested</th>
              <th>Sell cost</th>
              <th>Buy cost</th>
              <th>Seller station</th>
              <th>Buyer station</th>
              <th>Jumps</th>
              <th>Security</th>
              <th>actions</th>
            </tr>
            </thead>

            <tbody>
            {this.state.opportunities.map((op, index) => (
              <tr className={savedElem.has(this.elementHash(op)) ? 'selected' : 'mainItems'} key={index}>
                <th title={`seller_id:${op['seller_id']} / buyer_id:${op['buyer_id']}`}
                    onDoubleClick={() => this.copyToClipboard(op.name)}>{op.name} {(op.iconId) &&
                <Img className="icon" src={`https://images.evetech.net/types/${op.iconId}/icon`}/>}</th>
                <th
                  onDoubleClick={() => this.copyToClipboard(op.volume)}>{op.volume}m&#179;/{Math.round(op.volume * Math.min(op.available, op.requested) * 100) / 100}m&#179;</th>
                <th className="thinline"
                    onDoubleClick={() => this.copyToClipboard(op.earning)}>&asymp; {op.earning.toLocaleString()} ISK
                </th>
                <th className="thinline"
                    onDoubleClick={() => this.copyToClipboard(op.investment)}>{op.investment.toLocaleString()} ISK
                </th>
                <th
                  onDoubleClick={() => this.copyToClipboard(Math.min(op.requested, op.available))}>{op.available}/{op.requested}</th>
                <th className="thinline"
                    onDoubleClick={() => this.copyToClipboard(op.sell)}>{op.sell.toLocaleString()} ISK
                </th>
                <th className="thinline"
                    onDoubleClick={() => this.copyToClipboard(op.buy)}>{op.buy.toLocaleString()} ISK
                </th>
                <th title={op['seller_place_id']}
                    onDoubleClick={() => this.copyToClipboard(op['seller_place'])}>{op['seller_place']}</th>
                <th title={op['buyer_place_id']}
                    onDoubleClick={() => this.copyToClipboard(op['buyer_place'])}>{op['buyer_place']}</th>
                <th onDoubleClick={() => this.copyToClipboard(op.jumps)}>{op.jumps}</th>
                <th onDoubleClick={() => this.copyToClipboard(op.securityStatus)}>{op.securityStatus}</th>
                <th className="thinline">
                  <button className="Button ButtonAction"
                          onClick={() => this.saveElement(op)}
                          title={savedElem.has(this.elementHash(op)) ? 'unsave' : 'save'}>
                    {savedElem.has(this.elementHash(op)) ? '-' : '+'}
                  </button>
                  <button className="Button ButtonAction"
                          onClick={() => this.deleteOpportunity(op.id)} title="remove">x
                  </button>
                </th>
              </tr>
            ))}
            </tbody>
          </table>

          <div>
            {this.state.pages.map((p, index) => (
              <button className={p === this.state.pagination.page ? 'page dark active' : 'page dark'} key={index}
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
