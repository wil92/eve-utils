import axios from "axios";

import logo from './logo.svg';
import './App.css';
import {jwtInterceptor} from "./services/AxiosInterceptor";
import {sendMessageAndWaitResponse} from "./services/MessageHandler";

jwtInterceptor();

function App() {

  // window.addEventListener('message', evt => {
  //   switch (evt.data.type) {
  //     case 'refresh-token-response':
  //       console.log(evt.data.auth);
  //       break;
  //     case 'load-value-response':
  //       console.log(evt.data.value);
  //       break;
  //   }
  // });

  function click() {
    // Make a request for a user with a given ID
    axios.get('https://esi.evetech.net/v1/universe/regions/')
      .then(function (response) {
        // handle success
        // console.log(response);
        response.data.forEach(id => getRegionInfo(id));
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  }

  function getRegionInfo(id) {
    axios.get(`https://esi.evetech.net/v1/universe/regions/${id}/`)
      .then(function (response) {
        // handle success
        console.log(response.data);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  }

  function getRegionMarkets() {
    axios.get(`https://esi.evetech.net/v1/markets/${10000016}/orders/`)
      .then(function (response) {
        // handle success
        console.log(response.data);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  }

  async function getUserInfo() {
    const userInfo = await sendMessageAndWaitResponse({type: 'user-info'});
    console.log(userInfo);
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo"/>
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <button onClick={click}>some</button>
        <button onClick={getRegionMarkets}>markets</button>
        <button onClick={getUserInfo}>user info</button>

        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
