const path = require('path');

const {app, BrowserWindow} = require('electron');
const isDev = require('electron-is-dev');
const AuthService = require("./AuthService");

function getAuthConfig() {
  return {
    authorizeEndpoint: 'https://login.eveonline.com/v2/oauth/authorize/',
    clientId: '767560549db84d31959f24ba02ca0bab',
    scope: 'publicData',
    redirectUri: 'http://localhost:4538/',
    tokenEndpoint: 'https://login.eveonline.com/v2/oauth/token'
  };
}

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
  const authService = AuthService(getAuthConfig());

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Auth in EVE'
  });

  const url = authService.requestAuthCode();
  const fs = require('fs');
  fs.writeFileSync('out.txt', url, {encoding: "utf8"})
  win.loadURL(url);
  if (isDev) {
    win.webContents.openDevTools({mode: 'detach'});
  }

  win.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
    /*
      after successfuly authenticating
      get auth code from the redirect uri
      and use that and the code verifier
      to request an access code
    */
    authService.requestAccessCode(newUrl).then(() => {
      createAppWindow();
      win.close();
    });
  });
}

function createAppWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'utils',
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // and load the index.html of the app.
  // win.loadFile("index.html");
  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
  // Open the DevTools.
  if (isDev) {
    win.webContents.openDevTools({mode: 'detach'});
  }
}

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });
