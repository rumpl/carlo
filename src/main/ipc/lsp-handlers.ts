import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC } from '@shared/ipc';
import type { LspStartOptions, LspToServerPayload } from '@shared/lsp-types';
import { LspServerManager } from '../lsp/LspServerManager';

export function registerLspHandlers(win: BrowserWindow): LspServerManager {
  const manager = new LspServerManager((channel, payload) =>
    win.webContents.send(channel, payload),
  );

  ipcMain.handle(IPC.lspStart, (_event, opts: LspStartOptions) => {
    try {
      return { connectionId: manager.start(opts) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });
  ipcMain.handle(IPC.lspStop, (_event, { connectionId }: { connectionId: string }) => {
    manager.stop(connectionId);
    return { ok: true };
  });
  ipcMain.on(IPC.lspToServer, (_event, payload: LspToServerPayload) =>
    manager.toServer(payload.connectionId, payload.message),
  );
  app.on('before-quit', () => manager.stopAll());
  return manager;
}
