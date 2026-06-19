import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC } from '@shared/ipc';
import { loadLanguageConfig } from './config/language-config';
import { createWindow } from './window';

ipcMain.handle(IPC.ping, () => 'pong');
loadLanguageConfig();

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
