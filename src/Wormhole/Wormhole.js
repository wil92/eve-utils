import {Component} from "react";

import './Wormhole.css';
import {observable} from "../services/MessageHandler";
import {ANOMALY_TYPE_WORMHOLE, LexicoAnalyser} from "../services/AnomalyInterpreter";
import moment from "moment";
import Graph from "./Graph/Graph";

class Wormhole extends Component {

  constructor(props) {
    super(props);

    this.state = {
      systemAnomalies: []
    };
  }

  componentDidMount() {
    // this.subscription = observable.subscribe(message => {
    //   if (message.type === 'log-response') {
    //     this.addNewLog(message.message);
    //   } else if (message.type === 'unblock-response') {
    //     this.setState({logs: []});
    //   }
    // });
  }

  componentWillUnmount() {
    // this.subscription.unsubscribe();
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
          <div>current location</div>
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
