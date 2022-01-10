const path = require('path');

const {app, BrowserWindow, ipcMain} = require('electron');

const AuthService = require("./services/AuthService");
const SyncDataService = require('./services/SyncDataService');
const dataService = require('./services/DataService');
const ordersService = require('./services/AnalyseOrdersService');
const config = require('./services/config');
const url = require("url");
const logsService = require("./services/LogsService");

const authService = AuthService(config);
const syncDataService = SyncDataService();

const isDev = !app.isPackaged;
let window;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createAuthWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    dataService.terminateDBConnection();
    app.quit();
  }
});

async function createAuthWindow() {
  await dataService.initDatabase();

  window = new BrowserWindow({
    width: 1350,
    height: 700,
    title: 'EVE utilities',
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  logsService.setWindow(window);

  if (isDev) {
    window.webContents.openDevTools({mode: 'right'});
  }


  const auth = await dataService.loadObjValue('auth');
  if (!auth) {
    await openLoginPage();
  } else {
    openApp();
  }
}

ipcMain.on('refresh-token', async (evt, data) => {
  const expire = await dataService.loadNumValue('expire') || 0;
  if (expire < new Date().getTime()) {
    await refreshToken(data.id);
  } else {
    await updateTokenInUI(data.id);
  }
});

ipcMain.on('logout', async () => {
  await logout();
});

ipcMain.on('save-value', async (event, data) => {
  await dataService.saveValue(data.key, data.value);
});

ipcMain.on('load-value', async (event, data) => {
  const value = await dataService.loadValue(data.key);
  window.webContents.send('in-message', {type: 'load-value-response', value, id: data.id});
});

ipcMain.on('sync-all-data', async (event, data) => {
  const authData = await dataService.loadObjValue('auth');
  await syncDataService.syncAllData(authData['access_token']);
  logsService.unblock();
});

ipcMain.on('sync-orders-data', async () => {
  const authData = await dataService.loadObjValue('auth');
  await syncDataService.syncAllOrders(authData['access_token']);
  await sendTableResult({page: 1});
  logsService.unblock();
});

ipcMain.on('calculate-market', async (event, data) => {
  logsService.log('Start market calculation' + JSON.stringify(data));
  await ordersService.calculateBestOffers(data.region);
  await sendTableResult({page: 1});
  logsService.unblock();
});

ipcMain.on('table-data', async (event, data) => {
  await sendTableResult(data);
  logsService.unblock();
});

ipcMain.on('get-regions', async (event, data) => {
  const regions = await dataService.getAllRegions();
  window.webContents.send('in-message', {type: 'get-regions-response', regions, id: data.id});
});

async function sendTableResult(data) {
  const result = await dataService.getMarketOpportunities(data.page || 0, 20, data.moneyLimit);
  const count = await dataService.getMarketOpportunitiesCount(data.moneyLimit);
  window.webContents.send('in-message', {
    type: 'table-data-response',
    data: result,
    pagination: {total: Math.floor(count / 20) + (count % 20 === 0 ? 0 : 1), page: data.page || 0}
  });
}

ipcMain.on('user-info', async (event, data) => {
  const authData = await dataService.loadObjValue('auth');
  const expire = await dataService.loadNumValue('expire') || 0;
  if (expire < new Date().getTime()) {
    await refreshToken();
  }
  const userInfo = await authService.getUserInfo(authData['access_token']);
  window.webContents.send('in-message', {type: 'user-info-response', userInfo, id: data.id});
});

async function refreshToken(id = null) {
  try {
    const authData = await dataService.loadObjValue('auth');
    const auth = await authService.refreshToken(authData.refresh_token);
    await dataService.saveValue('auth', auth);
    await dataService.saveValue('expire', getExpirationDate(auth['expires_in']));
    await updateTokenInUI(id);
  } catch (e) {
    console.error(e);
    await logout();
  }
}

async function logout() {
  await dataService.saveValue('auth', null);
  await dataService.saveValue('expire', null);
  await openLoginPage();
}

async function openLoginPage() {
  await window.loadURL(authService.requestAuthCode());

  window.webContents.on('did-redirect-navigation', (event, newUrl) => {
    authService.requestAccessCode(newUrl).then(async (auth) => {
      // save auth information
      await dataService.saveValue('auth', auth);
      await dataService.saveValue('expire', getExpirationDate(auth['expires_in']));

      openApp().then(() => {
        updateTokenInUI();
      });
    });
  });
}

function openApp() {
  return window.loadURL(
    isDev
      ? 'http://localhost:3000'
      : url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
      })
  );
}

async function updateTokenInUI(id = null) {
  const expire = await dataService.loadNumValue('expire') || 0;
  const auth = await dataService.loadObjValue('auth');
  window.webContents.send('in-message', {type: 'refresh-token-response', auth, expire, id});
}

function getExpirationDate(expiresIn) {
  return Math.floor(new Date().getTime() + expiresIn * 1000 * 2 / 3);
}
