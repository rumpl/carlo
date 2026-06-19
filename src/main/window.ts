import { BrowserWindow, nativeTheme } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'node:path';
import { IPC } from '@shared/ipc';
import { registerFileHandlers } from './ipc/file-handlers';
import { registerGitHandlers } from './ipc/git-handlers';
import { registerLspHandlers } from './ipc/lsp-handlers';
import { registerWindowHandlers } from './ipc/window-handlers';
import { installAppMenu } from './menu';

export function createWindow(): BrowserWindow {
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

  registerFileHandlers(win);
  registerGitHandlers();
  registerLspHandlers(win);
  registerWindowHandlers();
  installAppMenu(win);
  nativeTheme.on('updated', () =>
    win.webContents.send(IPC.themeOsChanged, { shouldUseDark: nativeTheme.shouldUseDarkColors }),
  );

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
