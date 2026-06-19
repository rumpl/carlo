import { app, ipcMain, type WebContents } from 'electron';
import { IPC } from '@shared/ipc';
import type { LspStartOptions, LspToServerPayload } from '@shared/lsp-types';
import { LspServerManager } from '../lsp/LspServerManager';

const managers = new Map<number, LspServerManager>();

function managerFor(sender: WebContents): LspServerManager {
  const webContentsId = sender.id;
  let manager = managers.get(webContentsId);
  if (!manager) {
    manager = new LspServerManager((channel, payload) => sender.send(channel, payload));
    managers.set(webContentsId, manager);
    sender.once('destroyed', () => {
      manager?.stopAll();
      managers.delete(webContentsId);
    });
  }
  return manager;
}

export function registerLspHandlers(): void {
  ipcMain.handle(IPC.lspStart, (event, opts: LspStartOptions) => {
    try {
      return { connectionId: managerFor(event.sender).start(opts) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });
  ipcMain.handle(IPC.lspStop, (event, { connectionId }: { connectionId: string }) => {
    managerFor(event.sender).stop(connectionId);
    return { ok: true };
  });
  ipcMain.on(IPC.lspToServer, (event, payload: LspToServerPayload) =>
    managerFor(event.sender).toServer(payload.connectionId, payload.message),
  );
  app.on('before-quit', () => {
    for (const manager of managers.values()) manager.stopAll();
    managers.clear();
  });
}
