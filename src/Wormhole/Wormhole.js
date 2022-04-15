import {Component} from "react";
import moment from "moment";

import './Wormhole.css';
import {observable, sendMessage} from "../services/MessageHandler";
import {ANOMALY_TYPE_WORMHOLE, LexicoAnalyser} from "../services/AnomalyInterpreter";
import Graph from "./Graph/Graph";
import {filter} from "rxjs";

class Wormhole extends Component {

  constructor(props) {
    super(props);

    this.state = {
      systemAnomalies: [],
      systemName: '',
      systemClass: ''
    };
  }

  componentDidMount() {
    this.subscription = observable.pipe(filter(m => m.type === 'get-current-location-response')).subscribe(message => {
      console.log(message.location);
      this.setState({
        systemName: message.location.system.name,
        systemClass: message.location.system['system_class']
      })
    });

    console.log('aaa')
    sendMessage({type: 'get-current-location'});
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  async copyFromClipBoard() {
    const text = await navigator.clipboard.readText();
    const analyser = new LexicoAnalyser(text);
    this.setState({systemAnomalies: analyser.readAnomalies()});
  }

  render() {
    return (
      <div className="Wormhole">
        <div className="Head">
          <div>current location: {this.state.systemName}|{this.state.systemClass}</div>
          <button onClick={() => this.copyFromClipBoard()}>copy from clipboard</button>
          <table className="table-anomalies">
            <thead>

            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Age</th>
              <th>Leads To</th>
              <th>Life</th>
              <th>Mass</th>
            </tr>
            </thead>
            <tbody>
            {this.state.systemAnomalies.map((anomaly, index) => anomaly.type === ANOMALY_TYPE_WORMHOLE ?
              (<tr key={index}>
                <td>{anomaly.id}</td>
                <td>{anomaly.type}</td>
                <td>{moment(anomaly.createdAt).fromNow()}</td>
                <td>{anomaly.to}</td>
                <td>{anomaly.life}</td>
                <td>{anomaly.mass}</td>
              </tr>) :
              (<tr key={index}>
                <td>{anomaly.id}</td>
                <td>{anomaly.type}</td>
                <td>{moment(anomaly.createdAt).fromNow()}</td>
                <td colSpan={3}>{anomaly.name}</td>
              </tr>)
            )}
            </tbody>
          </table>
        </div>
        <div className="Body">
          <Graph/>
        </div>
      </div>
    );
  }
}

export default Wormhole;
