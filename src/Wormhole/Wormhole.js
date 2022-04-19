import {Component} from "react";
import {filter, Subject, takeUntil} from "rxjs";
import axios from "axios";
import Modal from "react-modal";

import './Wormhole.css';
import {observable, sendMessage, sendMessageAndWaitResponse} from "../services/MessageHandler";
import {ANOMALY_TYPE_WORMHOLE, LexicoAnalyser} from "../services/AnomalyInterpreter";
import Graph from "./Graph/Graph";

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
      // navigation tree
      treeRootId: 0,
      syncUserSystem: true,

      // attributes
      editAnomaly: false,
      anomalyId: '',
      leadsToName: ''
    };

    this.unsubscribe = new Subject();
  }

  componentDidMount() {
    this.getLinks().then(data => {
      (data.links || []).forEach(l => linksMap.set(l.name, l.url));
      this.initialSetup();
    });
  }

  async getLinks() {
    return axios.get(`https://eveutils.guilledev.com/links`)
      .then(res => res.data);
  }

  initialSetup() {
    this.subscription = observable.pipe(
      filter(m => m.type === 'get-current-location-response'),
      filter(m => m.location.system.id !== this.state.currentSystem.id),
      takeUntil(this.unsubscribe)
    ).subscribe(message => {
      this.setState({currentSystem: message.location.system});
      if (this.state.syncUserSystem) {
        sendMessage({type: 'load-anomalies', systemId: message.location.system.id});
        this.setState({
          system: {
            name: message.location.system.name,
            class: message.location.system['system_class'],
            id: message.location.system.id
          }
        });
      }
      this.setState({
        treeRootId: message.location.system.id,
      });
      sendMessage({type: 'load-tree', systemId: message.location.system.id});
    });
    this.subscription = observable.pipe(
      filter(m => m.type === 'load-anomalies-response'),
      takeUntil(this.unsubscribe)
    ).subscribe(message => {
      this.setState({systemAnomalies: message.anomalies.map(a => ({...a, link: linksMap.get(a.name)}))});
    });
    this.subscription = observable.pipe(
      filter(m => m.type === 'load-system-response'),
      takeUntil(this.unsubscribe)
    ).subscribe(message => {
      this.setState({
        system: {
          name: message.system.name,
          class: message.system['system_class'],
          id: message.system.id
        }
      });
      sendMessage({type: 'load-anomalies', systemId: message.system.id});
    });
    this.subscription = observable.pipe(
      filter(m => m.type === 'update-anomaly-destination-response'),
      takeUntil(this.unsubscribe)
    ).subscribe(message => {
      sendMessage({type: 'load-tree', systemId: this.state.treeRootId});
    });

    sendMessage({type: 'get-current-location'});
  }

  componentWillUnmount() {
    this.unsubscribe.next(true);
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

  openEditAnomalyModal(anomalyId, leadsToName) {
    this.setState({editAnomaly: true, anomalyId, leadsToName});
  }

  render() {
    return (
      <div className="Wormhole">
        <div className="Head">
          <div className="data-container">
            <div className="current-anomaly-status">
              <div>{this.state.system.name}</div>
              <div>{this.state.system.class}</div>
            </div>
            <div>
              <div className="table-actions">
                <button onClick={() => this.copyFromClipBoard()}>copy from clipboard</button>
                <button>remove</button>
              </div>
              <table className="table-anomalies">
                <thead>
                <tr>
                  <th><input type="checkbox"/></th>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Age</th>
                  <th>Name/LeadsTo</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {this.state.systemAnomalies.map((anomaly, index) => (<tr key={index}>
                    <td><input type="checkbox"/></td>
                    <td>{anomaly.id}</td>
                    <td>{anomaly.type}</td>
                    <td>{this.ageInMinutes(anomaly.expiration)}</td>
                    {anomaly.type === ANOMALY_TYPE_WORMHOLE ? (<td>{anomaly['system_name'] && <a
                      onClick={() => this.changeSelectedSystem(anomaly['system_destination'])}>{anomaly['system_name']}</a>}</td>) : (
                      <td>{anomaly.link ? (
                        <a href={anomaly.link} target="_blank">{anomaly.name}</a>) : anomaly.name}</td>)}
                    <td>
                      <button onClick={() => this.openEditAnomalyModal(anomaly.id, anomaly['system_name'])}>Edit</button>
                    </td>
                  </tr>)
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="Body">
          <div className="graph-actions">
            <div className="graph-actions-tab active">Follow ship</div>
            {/*<div className="graph-actions-tab">J111255</div>*/}
            {/*<div className="graph-actions-tab">+</div>*/}
          </div>
          <Graph openEditAnomalyModal={this.openEditAnomalyModal.bind(this)}/>
        </div>

        <Modal isOpen={this.state.editAnomaly}
               onRequestClose={() => this.setState({editAnomaly: false})}
               style={{content: {...customStyles.content, width: '300px', height: 'auto', overflow: 'hidden'}}}>
          <button className="CloseButton"
                  onClick={() => this.setState({editAnomaly: false})}>
            x
          </button>
          <h3>{this.state.anomalyId}</h3>
          <p></p>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <label htmlFor="selectRegionsToGetOrders">Leads to</label>
            <input type="text"
                   value={this.state.leadsToName}
                   onChange={e => this.setState({leadsToName: e.target.value})}/>
            ------------------------------------
            <button className="Button"
                    style={{margin: '10px 0', width: '100%'}}
                    onClick={() => this.editAnomaly()}>
              Update
            </button>
          </div>
        </Modal>
      </div>
    );
  }
}

export default Wormhole;
