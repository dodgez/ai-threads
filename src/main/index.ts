import type { Message as BedrockMessage } from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';

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

ipcMain.handle('chat', async (event, messages: BedrockMessage[]) => {
  const client = new BedrockRuntimeClient({ region: 'us-west-2' });
  const command = new ConverseStreamCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    messages,
  });

  try {
    const response = await client.send(command);

    if (response.stream) {
      for await (const data of response.stream) {
        event.sender.send('responseEvent', data);
      }
    }

    return response.$metadata;
  } catch (e) {
    return (e as { $metadata: Record<string, unknown> }).$metadata;
  }
});

void app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
