import {Component} from "react";

import loading from '../loading.png';
import './Loading.css';
import {observable} from "../services/MessageHandler";

class Loading extends Component {

  constructor(props) {
    super(props);

    this.state = {
      logs: []
    };
  }

  componentDidMount() {
    this.subscription = observable.subscribe(message => {
      if (message.type === 'log-response') {
        this.addNewLog(message.message);
      } else if (message.type === 'unblock-response') {
        this.setState({logs: []});
      }
    });
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
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
        <div className="IconContainer">
          <img src={loading} className="LoadingIcon" alt="loading"/>
        </div>
        <div className="Logs">
          {this.state.logs.map((log, i) => (
            <span className="Log" key={i} id={i}>{log.time} / {log.message}</span>
          ))}
        </div>
      </div>
    );
  }
}

export default Loading;
