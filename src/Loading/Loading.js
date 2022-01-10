import {Component} from "react";

import loading from '../loading-svgrepo-com.svg';
import './Loading.css';
import {observable} from "../services/MessageHandler";

class Loading extends Component {

  constructor(props) {
    super(props);

    this.state = {
      logs: []
    };

    observable.on(async (type, data) => {
      if (type === 'log-response') {
        this.addNewLog(data.message);
      } else if (type === 'unblock-response') {
        this.setState({logs: []});
      }
    });
  }

  addNewLog(message) {
    const logs = this.state.logs;
    logs.push({message: message, time: new Date().toLocaleTimeString()});
    while (logs.length > 15) {
      logs.shift();
    }
    this.setState({logs});
  }

  render() {
    return (
      <div className="Loading">
        <img src={loading} className="LoadingIcon" alt="loading"/>
        <div className="Logs">
          {this.state.logs.map((log, i) => (
            <span className="Log" id={i}>{log.time} / {log.message}</span>
          ))}
        </div>
      </div>
    );
  }
}

export default Loading;
