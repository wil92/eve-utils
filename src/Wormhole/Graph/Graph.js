import {Component} from "react";

import './Graph.css';
import System from "./System";
import {SystemModel, WormholeModel} from "./GraphModels";
import Path from "./Path";
import {observable} from "../../services/MessageHandler";
import {filter, Subject, takeUntil} from "rxjs";
import {bfsOverTree, updateTree} from "../../services/TreeService";

const scaleDelta = 0.001;
const marginHeight = 30;
const marginWidth = 80;

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
      rootSystem: null,
      systemTree: {},
      systems: [],
      paths: []
    };

    this.unsubscribe = new Subject();
    this.handleTransform = this.handleTransform.bind(this);
  }

  componentDidMount() {
    this.subscription = observable.pipe(
      filter(m => m.type === 'load-tree-response'),
      takeUntil(this.unsubscribe)
    ).subscribe(message => {
      this.setState({
        startPosition: {x: 0, y: 0},
        movement: {x: 0, y: 0},
        systemTree: {},
        systems: [],
        paths: []
      });

      if (!this.state.rootSystem || this.state.rootSystem.id !== message.tree[0].system.id) {
        this.setState({
          position: {x: 0, y: 0, scale: 1},
          rootSystem: message.tree[0].system.id
        });
      }

      const mapNodePos = new Map();
      (message.tree || []).forEach((n, index) => mapNodePos.set(n.system.id, index));

      const systemMap = new Map();
      const systemTree = new SystemModel(
        message.tree[0].system.id,
        message.tree[0].system.name,
        message.tree[0].system['system_class'],
        true
      );
      systemMap.set(systemTree.info.id, systemTree);

      const used = new Set();
      used.add(message.tree[0].system.id);
      const queue = [{item: message.tree[0], node: systemTree}];
      while (queue.length > 0) {
        const no = queue.shift();

        for (let i = 0; i < no.item.wormholes.length; i++) {
          if (no.item.wormholes[i]['system_destination']) {
            const systemId = no.item.wormholes[i]['system_destination'];
            if (!used.has(systemId)) {
              used.add(systemId);
              const treeNode = message.tree[mapNodePos.get(systemId)];
              const subTree = systemMap.has(systemId) ?
                systemMap.get(systemId) :
                new SystemModel(systemId, treeNode.system.name, treeNode.system['system_class']);
              systemMap.set(systemId, subTree);
              queue.push({item: treeNode, node: subTree});
              no.node.wormholes.push(new WormholeModel(no.item.wormholes[i], no.node, subTree));
            }
          } else {
            no.node.wormholes.push(new WormholeModel(no.item.wormholes[i], no.node, new SystemModel()));
          }
        }
      }

      this.setState({systemTree});
      this.calculateTreePositions(systemTree);
      this.calculatePaths(systemTree);
      updateTree(systemTree);
    });
  }

  componentWillUnmount() {
    this.unsubscribe.next(true);
  }

  handleTransform(event) {
    if (event.type === 'mousedown') {
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

    let initialX = system.position.x;
    const systems = [];
    bfsOverTree(system, (ele) => {
      ele.position.x -= initialX + 20;
      systems.push(ele);

      // set parent
      (ele.wormholes || []).forEach(w => w.destination.wormholeParent = w);
    });
    this.setState({systems});
  }

  calculatePaths(system) {
    const paths = [];

    bfsOverTree(system, (ele) => {
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
      w: Math.max(Math.abs(systemParent.getCenter().x - systemChild.getCenter().x), 1),
      h: Math.abs(systemParent.getCenter().y - systemChild.getCenter().y)
    };
    return {position, shape, invert: systemParent.position.x < systemChild.position.x};
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
      system.wormholes.sort((a, b) => a.anomaly.id.localeCompare(b.anomaly.id));

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
                    system={system}
                    openEditAnomalyModal={this.props.openEditAnomalyModal}/>
          ))}
        </div>

      </div>
    );
  }
}

export default Graph;
