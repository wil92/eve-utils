export class WormholeModel {
  /**
   * @param anomaly
   * @param origin {SystemModel}
   * @param destination {SystemModel}
   */
  constructor(anomaly, origin, destination) {
    this.anomaly = anomaly;

    /** {SystemModel} */
    this.origin = origin;

    /** {SystemModel} */
    this.destination = destination;
  }
}

export class SystemModel {
  constructor(id, name = '', category = '', root = false) {
    /** Wormhole[] */
    this.wormholes = [];

    /** {WormholeModel} */
    this.wormholeParent = null;

    /** {name: string, category: string} */
    this.info = {id, name, category, root};

    /** {x: number, y: number} */
    this.position = {x: 0, y: 0};

    /** {w: number, h: number} */
    this.shape = {w: 40, h: 50}
  }

  getCenter() {
    return {x: this.position.x + this.shape.w / 2, y: this.position.y + this.shape.h / 2};
  }
}
