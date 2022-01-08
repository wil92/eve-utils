const path = require('path');

const {app, BrowserWindow, ipcMain} = require('electron');
const isDev = require('electron-is-dev');

const AuthService = require("./AuthService");
const DataService = require('./DataService');
const http = require("http");

function getAuthConfig() {
  return {
    authorizeEndpoint: 'https://login.eveonline.com/v2/oauth/authorize/',
    clientId: '767560549db84d31959f24ba02ca0bab',
    scope: 'publicData',
    redirectUri: 'https://eveutils.guilledev.com/',
    tokenEndpoint: 'https://login.eveonline.com/v2/oauth/token',
    userInfoEndpoint: 'https://login.eveonline.com/oauth/verify'
  };
}

const dataService = DataService();
dataService.loadData();

const authService = AuthService(getAuthConfig());

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
    app.quit();
  }
});

function createAuthWindow() {
  window = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'EVE utilities',
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  if (isDev) {
    window.webContents.openDevTools({mode: 'right'});
  }

  if (!dataService.loadValue('auth')) {
    openLoginPage();
  } else {
    openApp();
  }
}

ipcMain.on('refresh-token', async (evt, data) => {
  const expire = dataService.loadValue('expire') || 0;
  if (expire < new Date().getTime()) {
    try {
      const authData = dataService.loadValue('auth');
      const auth = await authService.refreshToken(authData.refresh_token);
      dataService.saveValue('auth', auth);
      dataService.saveValue('expire', new Date().getTime() + auth.expires_in * 1000 * 2 / 3);
      updateTokenInUI(data.id);
    } catch (e) {
      console.error(e);
      logout();
    }
  } else {
    updateTokenInUI(data.id);
  }
});

ipcMain.on('logout', async () => {
  logout();
});

function logout() {
  dataService.saveValue('auth', null);
  dataService.saveValue('expire', null);
  openLoginPage();
}

ipcMain.on('save-value', async (event, data) => {
  dataService.saveValue(data.key, data.value);
});

ipcMain.on('user-info', async (event, data) => {
  const authData = dataService.loadValue('auth');
  const userInfo = await authService.getUserInfo(authData.access_token);
  window.webContents.send('in-message', {type: 'user-info-response', userInfo, id: data.id});
});

ipcMain.on('load-value', async (event, data) => {
  window.webContents.send('in-message', {type: 'load-value-response', value: dataService.loadValue(data.key), id: data.id});
});

function openLoginPage() {
  window.loadURL(authService.requestAuthCode());

  window.webContents.on('did-redirect-navigation', (event, newUrl) => {
    authService.requestAccessCode(newUrl).then((auth) => {
      // save auth information
      dataService.saveValue('auth', auth);
      dataService.saveValue('expire', new Date().getTime() + auth.expires_in * 1000 * 2 / 3);

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
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
}

function updateTokenInUI(id = null) {
  const expire = dataService.loadValue('expire') || 0;
  const auth = dataService.loadValue('auth');
  window.webContents.send('in-message', {type: 'refresh-token-response', auth, expire, id});
}
