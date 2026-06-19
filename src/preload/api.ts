import { ipcRenderer } from 'electron';
import { IPC } from '@shared/ipc';
import type { OpenFileResult, ReadFileResult, SaveAsDialogRequest, SaveAsDialogResult, SaveFileRequest, WorkspaceFolderResult } from '@shared/file-types';
import type { LspFromServerPayload, LspServerExit, LspStartOptions, LspStartResult } from '@shared/lsp-types';
import type { Message } from 'vscode-jsonrpc';

const on = <T>(channel: string, cb: (payload: T) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

export const api = Object.freeze({
  ping: () => ipcRenderer.invoke(IPC.ping) as Promise<string>,
  file: {
    openDialog: () => ipcRenderer.invoke(IPC.fileOpenDialog) as Promise<OpenFileResult | null>,
    read: (path: string) => ipcRenderer.invoke(IPC.fileRead, { path }) as Promise<ReadFileResult>,
    save: (request: SaveFileRequest) => ipcRenderer.invoke(IPC.fileSave, request) as Promise<{ ok: true }>,
    saveAsDialog: (request: SaveAsDialogRequest) => ipcRenderer.invoke(IPC.fileSaveAsDialog, request) as Promise<SaveAsDialogResult | null>,
  },
  workspace: {
    openFolderDialog: () => ipcRenderer.invoke(IPC.workspaceOpenFolderDialog) as Promise<WorkspaceFolderResult | null>,
  },
  lsp: {
    start: (opts: LspStartOptions) => ipcRenderer.invoke(IPC.lspStart, opts) as Promise<LspStartResult>,
    stop: (connectionId: string) => ipcRenderer.invoke(IPC.lspStop, { connectionId }) as Promise<{ ok: true }>,
    toServer: (connectionId: string, message: Message) => ipcRenderer.send(IPC.lspToServer, { connectionId, message }),
    onFromServer: (cb: (connectionId: string, message: Message) => void) => on<LspFromServerPayload>(IPC.lspFromServer, ({ connectionId, message }) => cb(connectionId, message)),
    onServerExit: (cb: (payload: LspServerExit) => void) => on<LspServerExit>(IPC.lspServerExit, cb),
  },
  menu: {
    onCommand: (cb: (commandId: string) => void) => on<{ commandId: string }>(IPC.menuCommand, ({ commandId }) => cb(commandId)),
  },
  theme: {
    onOsChanged: (cb: (payload: { shouldUseDark: boolean }) => void) => on(IPC.themeOsChanged, cb),
  },
});

export type CarloApi = typeof api;
