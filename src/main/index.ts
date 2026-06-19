import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC } from '@shared/ipc';
import { loadLanguageConfig } from './config/language-config';
import { loadUserConfig } from './config/user-config';
import { registerCliHandlers } from './ipc/cli-handlers';
import { registerConfigHandlers } from './ipc/config-handlers';
import { registerFileHandlers } from './ipc/file-handlers';
import { registerGitHandlers } from './ipc/git-handlers';
import { registerLspHandlers } from './ipc/lsp-handlers';
import { registerWindowHandlers } from './ipc/window-handlers';
import { registerLocalResourceProtocol, registerLocalResourceScheme } from './local-resource-protocol';
import { installAppMenu } from './menu';
import { initialWorkspacePath } from './workspace';
import { createWindow } from './window';

registerLocalResourceScheme();

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  ipcMain.handle(IPC.ping, () => 'pong');
  loadLanguageConfig();
  loadUserConfig();
  registerCliHandlers();
  registerConfigHandlers();
  registerFileHandlers();
  registerGitHandlers();
  registerLspHandlers();
  registerWindowHandlers();
  installAppMenu();

  app.on('second-instance', (_event, argv, workingDirectory) => {
    const win = createWindow({ initialWorkspacePath: initialWorkspacePath(argv, workingDirectory) });
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    registerLocalResourceProtocol();
    createWindow({ initialWorkspacePath: initialWorkspacePath() });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow({ initialWorkspacePath: initialWorkspacePath() });
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
