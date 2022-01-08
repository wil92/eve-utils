const {ipcRenderer} = require('electron');

const _setImmediate = setImmediate;
const _clearImmediate = clearImmediate;

process.once('loaded', () => {
    global.setImmediate = _setImmediate;
    global.clearImmediate = _clearImmediate;

    window.addEventListener('message', evt => {
        ipcRenderer.send(evt.data.type, evt.data);
    });

    ipcRenderer.on('in-message', (evt, message) => {
        window.postMessage(message);
    });
});
