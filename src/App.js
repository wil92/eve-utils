import {Component} from "react";
import Modal from 'react-modal';
import {NotificationContainer} from "react-notifications";
import {filter} from "rxjs";

import './App.css';
import 'react-notifications/lib/notifications.css';
import 'react-tabs/style/react-tabs.css';
import {Tab, TabList, TabPanel, Tabs} from "react-tabs";

import {jwtInterceptor} from "./services/AxiosInterceptor";
import {observable, sendMessage} from "./services/MessageHandler";
import Loading from "./Loading/Loading";
import Wormhole from "./Wormhole/Wormhole";
import Market from "./Market/Market";

jwtInterceptor();

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

Modal.setAppElement('#root');

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    sendMessage({type: 'load-value', key: 'firstLaunch'});
  }

  render() {
    return (
      <div className="App">
        {this.state.block && <Loading/>}
        <header className="App-header" dir="ltr">

          <Tabs forceRenderTabPanel direction={'ltr'}>
            <TabList>
              <Tab>Market</Tab>
              <Tab>Wormhole</Tab>
            </TabList>
            <TabPanel>
              <Market/>
            </TabPanel>
            <TabPanel>
              <Wormhole/>
            </TabPanel>
          </Tabs>

        </header>
        <NotificationContainer/>
      </div>
    );
  }
}

export default App;
