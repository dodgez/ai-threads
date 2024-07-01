import { fromIni } from '@aws-sdk/credential-providers';
import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';

void import('electron-context-menu').then((cm) => {
  cm.default();
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // mainWindow.webContents.openDevTools();
}

ipcMain.handle('creds', async (_event, profile?: string) =>
  fromIni({ profile })(),
);

void app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
