export const observable = {
  observers: [],

  on(observer) {
    this.observers.push(observer);
  },

  emit(type, data) {
    this.observers.forEach(obs => {
      if (typeof obs === "function") {
        obs(type, data);
      }
    });
  },

  disconnect(observer) {
    const l = this.observers.length;
    this.observers = this.observers.filter(obs => obs !== observer);
    return l !== this.observers.length;
  }
};

window.addEventListener('message', evt => {
  observable.emit(evt.data.type, evt.data);
});

export async function sendMessageAndWaitResponse(message) {
  const id = randomId();
  window.postMessage({...message, id});
  return new Promise((resolve, reject) => {
    const callback = function (type, data) {
      if (data.id === id && data.type !== message.type) {
        resolve(data);
        observable.disconnect(callback);
      }
    };
    observable.on(callback);
    setTimeout(() => {
      if (observable.disconnect(callback)) {
        reject('Time exceeded');
      }
    }, 3000);
  });
}

export function sendMessage(message) {
  window.postMessage(message);
}

function randomId() {
  return (new Array(10).fill(0)).reduce((p) => p + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)], '');
}
