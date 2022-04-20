import {Component} from "react";

import './System.css';
import {sendMessage} from "../../services/MessageHandler";
import {connect} from "react-redux";
import {getClassColor} from "../../services/SystemClassColor";


class System extends Component {

  constructor(props) {
    super(props);

    this.state = {
      system: props.system,
      editSystem: false,
      leadsToName: props.system.info.name,
      anomalyId: props.system.wormholeParent && props.system.wormholeParent.anomaly.id,
      parentName: props.system?.wormholeParent?.origin?.wormholeParent?.origin?.info?.name
    };

    this.handleTransform = this.handleTransform.bind(this);
  }

  handleTransform(event) {
    event.stopPropagation();
  }

  async changeSelectedSystem(systemId) {
    if (systemId) {
      sendMessage({type: 'load-system', systemId});
    } else {
      this.openEditAnomalyModal();
    }
  }

  openEditAnomalyModal() {
    this.props.openEditAnomalyModal(this.state.system.wormholeParent.anomaly.id, this.state.leadsToName, this.state.parentName);
  }

  render() {
    return (
      <div className="SolarSystem"
           title={this.state.system?.wormholeParent?.anomaly?.id || ''}
           onMouseDown={this.handleTransform}
           style={{
             left: `${this.state.system.position.x}px`,
             top: `${this.state.system.position.y}px`,
             width: `${this.state.system.shape.w}px`,
             height: `${this.state.system.shape.h}px`
           }}>
        <div className="Planets">
          <div className="Planet P1"/>
          <div className="Planet P2" style={{backgroundColor: getClassColor(this.state.system.info.category)}}>
            {this.state.system.info.category}
          </div>
        </div>
        {!this.state.system.info.root &&
          <div className="EditButton" onClick={() => this.openEditAnomalyModal()}>*</div>}
        <div className="SunOver"/>
        <div className="Sun"/>
        {this.props?.currentSystem?.id === this.state.system.info.id && <div className="CurrentSystem">🛸</div>}
        <div className="Name"
             onClick={() => this.changeSelectedSystem(this.state.system.info.id)}>
          {this.state.system.info.name || '?'}
        </div>
      </div>
    );
  }
}

export default connect(state => {
  return ({currentSystem: state.wormhole.system})
}, {})(System);
