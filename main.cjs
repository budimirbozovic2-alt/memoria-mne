const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:8080');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
