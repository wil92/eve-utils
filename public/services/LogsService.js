let window;

module.exports = {
  log(message) {
    console.log(message);
    window.webContents.send('in-message', {type: 'log-response', message});
  },

  setWindow(win) {
    window = win;
  },

  unblock() {
    window.webContents.send('in-message', {type: 'unblock-response'});
  }
};
