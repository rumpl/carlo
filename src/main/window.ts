import { BrowserWindow, app, nativeTheme } from 'electron';
import { join } from 'node:path';
import { IPC } from '@shared/ipc';
import { registerWindowWorkspace } from './ipc/file-handlers';

interface CreateWindowOptions {
  initialWorkspacePath?: string;
}

export function createWindow(options: CreateWindowOptions = {}): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'carlo',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 14, y: 12 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`blocked renderer window.open: ${url}`);
    return { action: 'deny' };
  });

  registerWindowWorkspace(win, options.initialWorkspacePath);

  const sendOsTheme = () =>
    win.webContents.send(IPC.themeOsChanged, { shouldUseDark: nativeTheme.shouldUseDarkColors });
  nativeTheme.on('updated', sendOsTheme);
  win.on('closed', () => nativeTheme.off('updated', sendOsTheme));

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
