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

    this.state = {
      firstLaunch: false,
      showSyncDataModal: false
    };
  }

  componentDidMount() {
    observable.pipe(filter(m => m.type === 'load-value-response')).subscribe((data) => {
      if (data.key === 'firstLaunch') {
        this.setState({firstLaunch: !!JSON.parse(data.value)});
      }
    });
    observable.pipe(filter(m => m.type === 'show-sync-data-dialog')).subscribe((data) => {
      if (!this.state.showSyncDataModal && !this.state.block) {
        this.setState({showSyncDataModal: true});
      }
    });

    sendMessage({type: 'load-value', key: 'firstLaunch'});
  }

  render() {
    return (
      <div className="App">
        {this.state.block && <Loading/>}
        <header className="App-header" dir="ltr">

          <Modal
            isOpen={this.state.showSyncDataModal || this.state.firstLaunch}
            onRequestClose={() => this.setState({showSyncDataModal: false})}
            style={{content: {...customStyles.content, width: '300px', height: 'auto', overflow: 'hidden'}}}>
            <button className="CloseButton"
                    onClick={() => this.setState({showSyncDataModal: false})}>x
            </button>
            <h3>Sync app with EVE server</h3>
            <p>You need to get the EVE online initial data to be able to use the current application.
              This button allow the application to get from EVE the 'regions', 'systems' and 'constellations'.
              This can take about 15min, be patient !!!
            </p>
            <div>
              <button className="Button" style={{margin: '10px 0', width: '100%'}}
                      onClick={() => this.syncAllData()}>sync all data
              </button>
            </div>
          </Modal>

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
