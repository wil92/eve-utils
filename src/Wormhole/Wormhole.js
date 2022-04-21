import {Component} from "react";
import {filter, Subject, takeUntil} from "rxjs";
import axios from "axios";
import Modal from "react-modal";
import {connect} from "react-redux";

import './Wormhole.css';
import {observable, sendMessage, sendMessageAndWaitResponse} from "../services/MessageHandler";
import {ANOMALY_TYPE_WORMHOLE, LexicoAnalyser} from "../services/AnomalyInterpreter";
import Graph from "./Graph/Graph";
import {getParentName} from "../services/TreeService";
import {updateCurrentSystem} from "../redux/store";
import {getClassColor} from "../services/SystemClassColor";
import {removeExtraSpaces} from "../services/Utils";

const linksMap = new Map();

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

class Wormhole extends Component {

  constructor(props) {
    super(props);

    this.state = {
      // current system
      currentSystem: {},
      // current selected system
      systemAnomalies: [],
      system: {
        name: '',
        class: '',
        id: 0
      },
      syncUserSystem: true,
      // navigation tree
      treeRootId: 0,
      treeRoots: [],
      syncTreeSystem: true,
      // attributes
      editAnomaly: false,
      anomalyId: '',
      leadsToName: '',
      parentName: ''
    };

    this.unsubscribe = new Subject();
  }

  componentDidMount() {
    this.getLinks().then(data => {
      (data.links || []).forEach(l => linksMap.set(removeExtraSpaces(l.name.toUpperCase()), l.url));
      this.initialSetup();
    });
  }

  async getLinks() {
    return axios.get(`https://eveutils.guilledev.com/links`)
      .then(res => res.data);
  }

  initialSetup() {
    this.subscription = observable.pipe(filter(m => m.type === 'get-current-location-response'), filter(m => m.location.system.id !== this.state.currentSystem.id), takeUntil(this.unsubscribe)).subscribe(message => {
      this.setState({currentSystem: message.location.system});
      this.props.updateCurrentSystem(message.location.system);
      if (this.state.syncUserSystem) {
        this.setState({
          system: {
            name: message.location.system.name,
            class: message.location.system['system_class'],
            id: message.location.system.id
          }
        });
        sendMessage({type: 'load-anomalies', systemId: message.location.system.id});
      }
      if (this.state.syncTreeSystem) {
        this.setState({treeRootId: message.location.system.id,});
        sendMessage({type: 'load-tree', systemId: message.location.system.id});
      }
    });
    this.subscription = observable.pipe(filter(m => m.type === 'load-anomalies-response'), takeUntil(this.unsubscribe)).subscribe(message => {
      this.setState({
        systemAnomalies: message.anomalies.map(a => ({
          ...a,
          selected: false,
          link: linksMap.get(removeExtraSpaces(a.name.toUpperCase()))
        })).sort((a, b) => a.id.localeCompare(b.id))
      });
    });
    this.subscription = observable.pipe(filter(m => m.type === 'load-system-response'), takeUntil(this.unsubscribe)).subscribe(message => {
      this.setState({
        system: {
          name: message.system.name,
          class: message.system['system_class'],
          id: message.system.id
        },
        syncUserSystem: message.system.id === this.state.currentSystem.id
      });
      sendMessage({type: 'load-anomalies', systemId: message.system.id});
    });
    this.subscription = observable.pipe(filter(m => m.type === 'update-anomaly-destination-response'), takeUntil(this.unsubscribe)).subscribe(message => {
      sendMessage({type: 'load-tree', systemId: this.state.treeRootId});
      sendMessage({type: 'load-anomalies', systemId: this.state.system.id});
    });

    sendMessage({type: 'get-current-location'});
    this.loadTabs().then();
  }

  componentWillUnmount() {
    this.unsubscribe.next(true);
  }

  async saveTabs(tabId, tabName) {
    if (!this.state.treeRoots.some(t => t.id === tabId)) {
      const list = [...this.state.treeRoots, {id: tabId, name: tabName}];
      await sendMessageAndWaitResponse({type: 'save-value', key: 'tabs', value: list});
      await this.loadTabs();
    }
  }

  async removeTab(e, tabId) {
    e.stopPropagation();
    const value = this.state.treeRoots.filter(t => t.id !== tabId);
    await sendMessageAndWaitResponse({type: 'save-value', key: 'tabs', value});
    await this.loadTabs();
    this.setSyncTreeSystem();
  }

  async loadTabs() {
    const value = (await sendMessageAndWaitResponse({type: 'load-value', key: 'tabs'})).value;
    try {
      const treeRoots = JSON.parse(value) || [];
      this.setState({treeRoots});
    } catch (e) {
    }
  }

  setSyncTreeSystem(rootSystem) {
    if (rootSystem) {
      this.setState({treeRootId: rootSystem.id, syncTreeSystem: false});
      sendMessage({type: 'load-tree', systemId: rootSystem.id});
    } else {
      this.setState({treeRootId: this.state.currentSystem.id, syncTreeSystem: true});
      sendMessage({type: 'load-tree', systemId: this.state.currentSystem.id});
    }
  }

  async copyFromClipBoard() {
    const text = await navigator.clipboard.readText();
    const analyser = new LexicoAnalyser(text);
    const anomalies = analyser.readAnomalies();
    await sendMessageAndWaitResponse({type: 'save-anomalies', anomalies, systemId: this.state.system.id});
    sendMessage({type: 'load-tree', systemId: this.state.treeRootId});
  }

  ageInMinutes(time) {
    const life = (new Date(time).getTime()) - (new Date().getTime());
    return `${Math.round(life / 60000)}m`
  }

  async changeSelectedSystem(systemId) {
    sendMessage({type: 'load-system', systemId});
  }

  async editAnomaly() {
    await sendMessageAndWaitResponse({
      type: 'update-anomaly-destination',
      anomalyId: this.state.anomalyId,
      destinationName: this.state.leadsToName
    });
    this.setState({editAnomaly: false});
  }

  openEditAnomalyModal(anomalyId, leadsToName = '', parentName) {
    this.setState({editAnomaly: true, anomalyId, leadsToName, parentName});
  }

  allChecker() {
    const status = this.state.systemAnomalies.reduce((p, a) => p && a.selected, true);
    this.setState({systemAnomalies: this.state.systemAnomalies.map(a => ({...a, selected: !status}))});
  }

  async removeAnomalies() {
    if (this.state.systemAnomalies.filter(a => a.selected).length > 0) {
      await sendMessageAndWaitResponse({
        type: 'remove-anomalies',
        anomalies: this.state.systemAnomalies.filter(a => a.selected).map(a => a.id),
        systemId: this.state.system.id
      });
      sendMessage({type: 'load-tree', systemId: this.state.treeRootId});
    }
  }

  shortName(name) {
    switch (name.toLowerCase()) {
      case 'ore site':
        return 'Ore';
      case 'combat site':
        return 'Combat';
      case 'gas site':
        return 'Gas';
      case 'relic site':
        return 'relic';
      case 'data site':
        return 'data';
      default:
        return name;
    }
  }

  render() {
    return (<div className="Wormhole">
      <div className="Head">
        <div className="data-container">
          <div className="current-anomaly-status">
            <div style={{
              fontSize: "14px",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              paddingTop: "5px"
            }}>
              Current system: {this.state.currentSystem.name}&#160;&#160;
              <div className="add-button"
                   onClick={() => this.changeSelectedSystem(this.state.currentSystem.id)}>&#187;</div>
            </div>
            <hr style={{width: "100%", marginTop: "5px"}}/>
            <div style={{fontSize: "20px", display: "flex", flexDirection: "row", justifyContent: "center"}}>
              {this.state.system.name} (<span
              style={{color: getClassColor(this.state.system.class)}}>{this.state.system.class}</span>)&#160;&#160;
              <div className="add-button"
                   onClick={() => this.saveTabs(this.state.system.id, this.state.system.name)}>+
              </div>
            </div>
          </div>
          <div className="table-anomalies-container">
            <div className="table-actions">
              <button className="Button"
                      disabled={this.state.systemAnomalies.filter(a => a.selected).length === 0}
                      onClick={() => this.removeAnomalies()}>remove
              </button>
              <button className="Button" onClick={() => this.copyFromClipBoard()}>copy from clipboard</button>
            </div>
            <div className="table-container scrollbar">
              <table className="table-anomalies">
                <thead>
                <tr>
                  <th><input type="checkbox"
                             onChange={() => this.allChecker()}
                             checked={this.state.systemAnomalies.reduce((p, a) => p && a.selected, true)}/></th>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Age</th>
                  <th>Name/LeadsTo</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {this.state.systemAnomalies.map((anomaly, index) => (
                  <tr key={index} className={anomaly.selected ? "row-selected" : ""}>
                    <td><input type="checkbox"
                               checked={anomaly.selected}
                               onChange={(e) => this.setState({
                                 systemAnomalies: this.state.systemAnomalies.map(a => a.id === anomaly.id ? {
                                   ...a,
                                   selected: e.target.checked
                                 } : a)
                               })}/></td>
                    <td style={{whiteSpace: "nowrap"}}>{anomaly.id}</td>
                    <td>{this.shortName(anomaly.type)}</td>
                    <td>{this.ageInMinutes(anomaly.expiration)}</td>
                    {anomaly.type === ANOMALY_TYPE_WORMHOLE ? (
                      <td style={{width: "100%"}}>{anomaly['system_name'] && <div
                        onClick={() => this.changeSelectedSystem(anomaly['system_destination'])}>{anomaly['system_name']}</div>}</td>) : (
                      <td>{anomaly.link ? (
                        <a href={anomaly.link} target="_blank"
                           rel="noreferrer">{anomaly.name}</a>) : anomaly.name}</td>)}
                    <td>
                      {anomaly.type === 'Wormhole' && <button className="Button"
                                                              onClick={() => this.openEditAnomalyModal(anomaly.id, anomaly['system_name'], getParentName(this.state.system.id))}>Edit
                      </button>}
                    </td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="Body">
        <div className="graph-container">
          <div className="graph-actions">
            <div
              className={"graph-actions-tab " + (this.state.treeRootId === this.state.currentSystem.id && this.state.syncTreeSystem ? 'active' : '')}
              onClick={() => this.setSyncTreeSystem()}>Follow
            </div>
            {(this.state.treeRoots || []).map((t, index) => (
              <div key={index}
                   className={"graph-actions-tab " + (this.state.treeRootId === t.id && !this.state.syncTreeSystem ? 'active' : '')}
                   onClick={() => this.setSyncTreeSystem(t)}>{t.name}
                <div style={{width: "100%"}}/>
                <div className="remove" onClick={(e) => this.removeTab(e, t.id)}>×</div>
              </div>))}
          </div>
          <Graph openEditAnomalyModal={this.openEditAnomalyModal.bind(this)}/>
        </div>
      </div>

      <Modal isOpen={this.state.editAnomaly}
             onRequestClose={() => this.setState({editAnomaly: false})}
             style={{content: {...customStyles.content, width: '300px', height: 'auto', overflow: 'hidden'}}}>
        <button className="CloseButton"
                onClick={() => this.setState({editAnomaly: false})}>
          x
        </button>
        <h3>{this.state.anomalyId}</h3>
        {/*<p></p>*/}
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <label htmlFor="selectRegionsToGetOrders">Leads to</label>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            <input type="text"
                   style={{width: '100%'}}
                   value={this.state.leadsToName}
                   onChange={e => this.setState({leadsToName: e.target.value})}/>
            {this.state.parentName && <button
              onClick={() => this.setState({leadsToName: this.state.parentName})}>{this.state.parentName}</button>}
            <button
              onClick={() => this.setState({leadsToName: this.state.currentSystem.name})}>{this.state.currentSystem.name}</button>
          </div>
          <button className="Button"
                  style={{margin: '30px 0 10px 0', width: '100%'}}
                  onClick={() => this.editAnomaly()}>
            Update
          </button>
        </div>
      </Modal>
    </div>);
  }
}

export default connect(() => ({}), {updateCurrentSystem})(Wormhole);
