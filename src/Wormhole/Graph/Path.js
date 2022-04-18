import {Component} from "react";

import './Path.css';

class Path extends Component {

  constructor(props) {
    super(props);

    this.state = {
      x: props.position.x,
      y: props.position.y,
      w: props.shape.w,
      h: props.shape.h,
      invert: props.invert,
      pathColor: "#4cc9f0"
    };
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    return (
      <div className="Path"
           style={{
             left: `${this.state.x}px`,
             top: `${this.state.y}px`,
             width: `${this.state.w}px`,
             height: `${this.state.h}px`
           }}>
        <svg height="100%"
             width="100%">
          {!this.state.invert && <path
            d={`M 0 ${this.state.h} L 0 ${this.state.h / 2} L ${this.state.w} ${this.state.h / 2} L ${this.state.w} 0`}
            stroke={this.state.pathColor}
            stroke-width="1"
            fill="none"/>}
          {this.state.invert && <path
            d={`M 0 0 L 0 ${this.state.h / 2} L ${this.state.w} ${this.state.h / 2} L ${this.state.w} ${this.state.h}`}
            stroke={this.state.pathColor}
            stroke-width="1"
            fill="none"/>}
        </svg>
      </div>
    );
  }
}

export default Path;
