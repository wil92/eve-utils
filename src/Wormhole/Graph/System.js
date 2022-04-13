import {Component} from "react";

import './System.css';

class System extends Component {

  constructor(props) {
    super(props);

    this.state = {
      system: props.system
    };

    this.handleTransform = this.handleTransform.bind(this);
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  handleTransform(event) {
    event.stopPropagation();
  }

  render() {
    return (
      <div className="System"
           onMouseDown={this.handleTransform}
           style={{left: `${this.state.system.position.x}px`, top: `${this.state.system.position.y}px`, width: `${this.state.system.shape.w}px`, height: `${this.state.system.shape.h}px`}}>
        {this.state.system.info.name}
      </div>
    );
  }
}

export default System;
