const path = require('path');

const {app, BrowserWindow} = require('electron');

const dataService = require('./services/DataService');
const logsService = require("./services/LogsService");
const CommunicationService = require('./services/CommunicationService');

let communicationService;

const isDev = !app.isPackaged;
let window;

app.whenReady().then(createAuthWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    dataService.terminateDBConnection();
    app.quit();
  }
});

async function createAuthWindow() {
  await dataService.initDatabase(app.getPath('appData'));

  window = new BrowserWindow({
    width: 1350,
    height: 700,
    title: 'EVE utilities',
    icon: path.join(__dirname, 'pngegg.png'),
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  window.maximize();
  logsService.setWindow(window);
  communicationService = CommunicationService(window);
  communicationService.registerMessages();

  if (isDev) {
    window.webContents.openDevTools({mode: 'right'});
  }

  window.setMenu(null);

  const auth = await dataService.loadObjValue('auth');
  if (!auth) {
    await communicationService.openLoginPage();
  } else {
    await communicationService.openApp();
  }
}
