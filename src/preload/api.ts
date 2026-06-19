import { ipcRenderer } from 'electron';
import { IPC } from '@shared/ipc';
import type {
  FileTreeNode,
  GitBaselineResult,
  OpenFileResult,
  ReadFileResult,
  SaveAsDialogRequest,
  SaveAsDialogResult,
  SaveFileRequest,
  WorkspaceChangedEvent,
  WorkspaceFolderResult,
} from '@shared/file-types';
import type { LanguageConfig } from '@shared/language-registry';
import type {
  LspFromServerPayload,
  LspServerExit,
  LspServerLog,
  LspServerStderr,
  LspStartOptions,
  LspStartResult,
} from '@shared/lsp-types';
import type { Message } from 'vscode-jsonrpc';

const on = <T>(channel: string, cb: (payload: T) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
};

export const api = Object.freeze({
  ping: () => ipcRenderer.invoke(IPC.ping) as Promise<string>,
  config: {
    language: () => ipcRenderer.invoke(IPC.configLanguage) as Promise<LanguageConfig>,
    languagePath: () => ipcRenderer.invoke(IPC.configLanguagePath) as Promise<{ path: string }>,
  },
  file: {
    openDialog: () => ipcRenderer.invoke(IPC.fileOpenDialog) as Promise<OpenFileResult | null>,
    read: (path: string) => ipcRenderer.invoke(IPC.fileRead, { path }) as Promise<ReadFileResult>,
    save: (request: SaveFileRequest) =>
      ipcRenderer.invoke(IPC.fileSave, request) as Promise<{ ok: true }>,
    saveAsDialog: (request: SaveAsDialogRequest) =>
      ipcRenderer.invoke(IPC.fileSaveAsDialog, request) as Promise<SaveAsDialogResult | null>,
  },
  git: {
    baseline: (path: string) =>
      ipcRenderer.invoke(IPC.gitBaseline, { path }) as Promise<GitBaselineResult>,
  },
  window: {
    zoomIn: () => ipcRenderer.invoke(IPC.windowZoomIn) as Promise<{ zoomLevel: number }>,
    zoomOut: () => ipcRenderer.invoke(IPC.windowZoomOut) as Promise<{ zoomLevel: number }>,
    zoomReset: () => ipcRenderer.invoke(IPC.windowZoomReset) as Promise<{ zoomLevel: number }>,
  },
  workspace: {
    openFolderDialog: () =>
      ipcRenderer.invoke(IPC.workspaceOpenFolderDialog) as Promise<WorkspaceFolderResult | null>,
    currentFolder: () =>
      ipcRenderer.invoke(IPC.workspaceCurrentFolder) as Promise<WorkspaceFolderResult>,
    listTree: (rootPath: string) =>
      ipcRenderer.invoke(IPC.workspaceListTree, { rootPath }) as Promise<{
        children: FileTreeNode[];
      }>,
    onChanged: (cb: (event: WorkspaceChangedEvent) => void) =>
      on<WorkspaceChangedEvent>(IPC.workspaceChanged, cb),
  },
  lsp: {
    start: (opts: LspStartOptions) =>
      ipcRenderer.invoke(IPC.lspStart, opts) as Promise<LspStartResult>,
    stop: (connectionId: string) =>
      ipcRenderer.invoke(IPC.lspStop, { connectionId }) as Promise<{ ok: true }>,
    toServer: (connectionId: string, message: Message) =>
      ipcRenderer.send(IPC.lspToServer, { connectionId, message }),
    onFromServer: (cb: (connectionId: string, message: Message) => void) =>
      on<LspFromServerPayload>(IPC.lspFromServer, ({ connectionId, message }) =>
        cb(connectionId, message),
      ),
    onServerExit: (cb: (payload: LspServerExit) => void) =>
      on<LspServerExit>(IPC.lspServerExit, cb),
    onServerStderr: (cb: (payload: LspServerStderr) => void) =>
      on<LspServerStderr>(IPC.lspServerStderr, cb),
    onServerLog: (cb: (payload: LspServerLog) => void) => on<LspServerLog>(IPC.lspServerLog, cb),
  },
  menu: {
    onCommand: (cb: (commandId: string) => void) =>
      on<{ commandId: string }>(IPC.menuCommand, ({ commandId }) => cb(commandId)),
  },
  theme: {
    onOsChanged: (cb: (payload: { shouldUseDark: boolean }) => void) => on(IPC.themeOsChanged, cb),
  },
});

export type CarloApi = typeof api;
