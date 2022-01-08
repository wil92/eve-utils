import logo from './logo.svg';
import './App.css';

function App() {

  window.addEventListener('message', evt => {
    switch (evt.data.type) {
      case 'refresh-token-response':
        console.log(evt.data.auth);
        break;
      case 'load-value-response':
        console.log(evt.data.value);
        break;
    }
  });

  const click = () => {
    // window.postMessage({type: 'refresh-token'});
    window.postMessage({type: 'load-value', key: 'expire'});
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <button onClick={click}>some</button>

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
