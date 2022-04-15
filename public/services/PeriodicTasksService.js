const {Subject} = require("rxjs");

const FPS = 1;
const intervalPerSecond = 1000 / FPS;
const observable = new Subject();

function requestAnimationFrame(cb) {
  setImmediate(() => cb(Date.now()))
}

module.exports = {
  startTimer() {
    this.lastTime = 0;
    this.global = 0;
    this.status = 'RUNNING';
    requestAnimationFrame(this.loop.bind(this));
  },

  stopTimer() {
    this.status = '';
  },

  loop(currentTime) {
    if (this.status === 'RUNNING') {
      this.currentTime = currentTime;
      if (intervalPerSecond <= currentTime - this.lastTime) {
        this.lastTime = currentTime;
        observable.next(++this.global);
      }

      requestAnimationFrame(this.loop.bind(this));
    }
  },

  getObservable() {
    return observable;
  }
}
