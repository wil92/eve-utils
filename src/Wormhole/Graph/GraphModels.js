export class WormholeModel {
  /**
   * @param destination {SystemModel}
   */
  constructor(destination) {
    /** {SystemModel} */
    this.destination = destination;
  }
}

export class SystemModel {
  constructor() {
    /** Wormhole[] */
    this.wormholes = [];

    /** {name: string, category: string} */
    this.info = {
      name: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5).toUpperCase(),
      category: 'C' + Math.floor(Math.random() * 6) + 1
    };

    /** {x: number, y: number} */
    this.position = {x: 0, y: 0};
    this.shape = {w: 80, h: 60}
  }
}
