import {Component} from "react";
import moment from "moment";
import {filter, Subject, takeUntil} from "rxjs";


import './Wormhole.css';
import {observable, sendMessage, sendMessageAndWaitResponse} from "../services/MessageHandler";
import {ANOMALY_TYPE_WORMHOLE, LexicoAnalyser} from "../services/AnomalyInterpreter";
import Graph from "./Graph/Graph";
import axios from "axios";

const linksMap = new Map();

class Wormhole extends Component {

  constructor(props) {
    super(props);

    this.state = {
      systemAnomalies: [],
      system: {
        name: '',
        class: '',
        id: 0
      },
      treeRoot: 0,
      syncUserSystem: true
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
      filter(m => m.location.system.name !== this.state.system.name),
      takeUntil(this.unsubscribe)
    ).subscribe(message => {
      if (this.state.syncUserSystem) {
        sendMessage({type: 'load-anomalies', systemId: message.location.system.id});
      }
      this.setState({
        system: {
          name: message.location.system.name,
          class: message.location.system['system_class'],
          id: message.location.system.id
        },
        treeRoot: message.location.system.id
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
      filter(m => m.type === 'update-anomaly-destination-response'),
      takeUntil(this.unsubscribe)
    ).subscribe(message => {
      sendMessage({type: 'load-tree', systemId: this.state.system.id});
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
    sendMessage({type: 'load-tree', systemId: this.state.system.id});
  }

  ageInMinutes(time) {
    console.log(time)
    const life = (new Date(time).getTime()) - (new Date().getTime());
    return `${Math.round(life / 60000)}m`
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
                </tr>
                </thead>
                <tbody>
                {this.state.systemAnomalies.map((anomaly, index) => (<tr key={index}>
                    <td><input type="checkbox"/></td>
                    <td>{anomaly.id}</td>
                    <td>{anomaly.type}</td>
                    <td>{this.ageInMinutes(anomaly.expiration)}</td>
                    {anomaly.type === ANOMALY_TYPE_WORMHOLE ? (<td>{anomaly.to}</td>) : (
                      <td>{anomaly.link ? (
                        <a href={anomaly.link} target="_blank">{anomaly.name}</a>) : anomaly.name}</td>)}
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
          <Graph/>
        </div>
      </div>
    );
  }
}

export default Wormhole;
