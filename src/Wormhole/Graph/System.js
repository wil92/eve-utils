import {Component} from "react";
import Modal from "react-modal";

import './System.css';
import {sendMessage, sendMessageAndWaitResponse} from "../../services/MessageHandler";

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

class System extends Component {

  constructor(props) {
    super(props);

    this.state = {
      system: props.system,
      editSystem: false,
      leadsToName: props.system.info.name
    };

    this.handleTransform = this.handleTransform.bind(this);
  }

  handleTransform(event) {
    event.stopPropagation();
  }

  async editSystem() {
    console.log(this.state.leadsToName, this.state.system.wormholeParent.anomaly.id);
    await sendMessageAndWaitResponse({
      type: 'update-anomaly-destination',
      anomalyId: this.state.system.wormholeParent.anomaly.id,
      destinationName: this.state.leadsToName
    });
  }

  render() {
    return (
      <div className="SolarSystem"
           onMouseDown={this.handleTransform}
           style={{
             left: `${this.state.system.position.x}px`,
             top: `${this.state.system.position.y}px`,
             width: `${this.state.system.shape.w}px`,
             height: `${this.state.system.shape.h}px`
           }}>
        <div className="Planets">
          <div className="Planet P1"/>
          <div className="Planet P2">
            {this.state.system.info.category}
          </div>
        </div>
        {!this.state.system.info.root &&
        <div className="EditButton" onClick={() => this.setState({editSystem: true})}>?</div>}
        <div className="SunOver"/>
        <div className="Sun"/>
        <div className="Name">{this.state.system.info.name}</div>
        <Modal isOpen={this.state.editSystem}
               onRequestClose={() => this.setState({editSystem: false})}
               style={{content: {...customStyles.content, width: '300px', height: 'auto', overflow: 'hidden'}}}>
          <button className="CloseButton"
                  onClick={() => this.setState({editSystem: false})}>x
          </button>
          <h3>Sync orders</h3>
          <p></p>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <label htmlFor="selectRegionsToGetOrders">System name</label>
            <input type="text"
                   value={this.state.leadsToName}
                   onChange={e => this.setState({leadsToName: e.target.value})}/>
            ------------------------------------
            <button className="Button" style={{margin: '10px 0', width: '100%'}}
                    onClick={() => this.editSystem()}>Update
            </button>
          </div>
        </Modal>
      </div>
    );
  }
}

export default System;
