import {Component} from "react";

import './Wormhole.css';
import {observable} from "../services/MessageHandler";

class Wormhole extends Component {

  constructor(props) {
    super(props);

    this.state = {
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

  render() {
    return (
      <div className="Wormhole">
        tests
      </div>
    );
  }
}

export default Wormhole;
