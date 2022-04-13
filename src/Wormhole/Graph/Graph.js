import {Component} from "react";

import './Graph.css';
import System from "./System";
import {SystemModel, WormholeModel} from "./GraphModels";
import Path from "./Path";

const scaleDelta = 0.001;
const marginHeight = 20;
const marginWidth = 30;

const MAX_SCALE_VALUE = 1.63;
const MIN_SCALE_VALUE = 0.67;

class Graph extends Component {

  constructor(props) {
    super(props);

    this.state = {
      position: {x: 0, y: 0, scale: 1},
      startPosition: {x: 0, y: 0},
      movement: {x: 0, y: 0},
      isModifying: false,
      systemTree: {},
      systems: [],
      paths: []
    };

    this.handleTransform = this.handleTransform.bind(this);
  }

  componentDidMount() {
    const n1 = new SystemModel();
    const n2 = new SystemModel();
    const n3 = new SystemModel();
    const n4 = new SystemModel();
    const n5 = new SystemModel();
    const n6 = new SystemModel();
    const n7 = new SystemModel();
    n1.wormholes = [
      new WormholeModel(n2),
      new WormholeModel(n3),
      new WormholeModel(n4)
    ];
    n2.wormholes = [
      new WormholeModel(n5),
      new WormholeModel(n6)
    ];
    n3.wormholes = [
      new WormholeModel(n7)
    ];

    this.setState({
      systemTree: n1,
      systems: [n1, n2, n3, n4, n5, n6, n7],
      paths: []
    });

    this.calculateTreePositions(n1);
    this.calculatePaths(n1);
  }

  componentWillUnmount() {
  }

  handleTransform(event) {
    if (event.type === 'mousedown') {
      this.state.startPosition.x = event.clientX;
      this.state.startPosition.y = event.clientY;
      this.setState({
        startPosition: {
          x: event.clientX,
          y: event.clientY
        },
        isModifying: true
      })
    } else if (event.type === 'mouseup' && this.state.isModifying) {
      this.setState({
        position: {
          ...this.state.position,
          x: this.state.position.x + (event.clientX - this.state.startPosition.x),
          y: this.state.position.y + (event.clientY - this.state.startPosition.y),
        },
        movement: {x: 0, y: 0},
        isModifying: false
      });
    } else if (event.type === 'mousemove' && this.state.isModifying) {
      this.setState({
        movement: {
          x: (event.clientX - this.state.startPosition.x),
          y: (event.clientY - this.state.startPosition.y),
        }
      });
    } else if (event.type === 'mouseleave' && this.state.isModifying) {
      this.setState({
        movement: {x: 0, y: 0,},
        isModifying: false
      });
    } else if (event.type === 'wheel' && !this.state.isModifying) {
      const scale = this.state.position.scale + event.deltaY * -scaleDelta;
      this.setState({
        position: {
          ...this.state.position,
          scale: Math.max(Math.min(scale, MAX_SCALE_VALUE), MIN_SCALE_VALUE)
        }
      });
    }
  }

  /**
   *
   * @param system {SystemModel}
   */
  calculateTreePositions(system) {
    this.calculateTree(system, 0, 20);

    let minX = Number.MAX_SAFE_INTEGER, maxX = Number.MIN_SAFE_INTEGER;
    this.bfsOverTree(system, (ele) => {
      minX = Math.min(minX, ele.position.x);
      maxX = Math.max(maxX, ele.position.x);
    });
    this.bfsOverTree(system, (ele) => {
      ele.position.x -= (maxX - minX);
    });
  }

  calculatePaths(system) {
    const paths = [];

    this.bfsOverTree(system, (ele) => {
      for (let i = 0; i < ele.wormholes.length; i++) {
        paths.push(this.buildPathInBetween(ele, ele.wormholes[i].destination));
      }
    });

    this.setState({paths});
  }

  buildPathInBetween(systemParent, systemChild) {
    const position = {
      x: Math.min(systemParent.getCenter().x, systemChild.getCenter().x),
      y: Math.min(systemParent.getCenter().y, systemChild.getCenter().y)
    };
    const shape = {
      w: Math.max(Math.abs(systemParent.getCenter().x - systemChild.getCenter().x), 4),
      h: Math.abs(systemParent.getCenter().y - systemChild.getCenter().y)
    };
    return {position, shape, invert: systemParent.position.x < systemChild.position.x};
  }

  bfsOverTree(system, callback) {
    const queue = [system];
    while (queue.length > 0) {
      const ele = queue.shift();
      callback(ele);
      for (let i = 0; i < ele.wormholes.length; i++) {
        queue.push(ele.wormholes[i].destination);
      }
    }
  }

  /**
   * @param system {SystemModel}
   * @param offsetX {number}
   * @param offsetY {number}
   */
  calculateTree(system, offsetX, offsetY) {
    let middleX = offsetX + marginWidth + system.shape.w;
    let offsetToReturn = middleX;

    if (system.wormholes.length > 0) {
      middleX = 0;
      let offsetTmp = offsetX;
      for (let i = 0; i < system.wormholes.length; i++) {
        offsetTmp = this.calculateTree(system.wormholes[i].destination, offsetTmp, offsetY + marginHeight + system.shape.h);
      }
      offsetToReturn = offsetTmp;
      middleX = (system.wormholes[system.wormholes.length - 1].destination.position.x - system.wormholes[0].destination.position.x) / 2
        + system.wormholes[0].destination.position.x;
    }

    system.position.x = middleX;
    system.position.y = offsetY;

    return offsetToReturn;
  }

  render() {
    return (
      <div className="Graph"
           onMouseDown={this.handleTransform}
           onMouseUp={this.handleTransform}
           onMouseMove={this.handleTransform}
           onMouseLeave={this.handleTransform}
           onWheel={this.handleTransform}>
        <div className="GraphContainer"
             style={{transform: `translate(${this.state.position.x + this.state.movement.x}px, ${this.state.position.y + this.state.movement.y}px) scale(${this.state.position.scale})`}}>
          {this.state.paths.map((path, index) => (
            <Path key={index}
                  invert={path.invert}
                  position={path.position}
                  shape={path.shape}/>
          ))}
          {this.state.systems.map((system, index) => (
            <System key={index}
                    system={system}/>
          ))}
        </div>

      </div>
    );
  }
}

export default Graph;
