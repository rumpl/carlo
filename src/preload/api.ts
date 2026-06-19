import { ipcRenderer } from 'electron';
import type { CarloUserConfig } from '@shared/app-config';
import { IPC } from '@shared/ipc';
import type {
  FileCopyRequest,
  FileCreateRequest,
  FileDeleteRequest,
  FileOperationResult,
  FileTreeNode,
  GitBaselineResult,
  OpenFileResult,
  ReadFileResult,
  SaveAsDialogRequest,
  SaveAsDialogResult,
  SaveFileRequest,
  WorkspaceChangedEvent,
  WorkspaceFolderResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
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
  app: {
    installCommandLine: () =>
      ipcRenderer.invoke(IPC.appInstallCommandLine) as Promise<
        | { ok: true; path: string; warning?: string }
        | { ok: false; error: string; instructions?: string }
      >,
  },
  config: {
    language: () => ipcRenderer.invoke(IPC.configLanguage) as Promise<LanguageConfig>,
    languagePath: () => ipcRenderer.invoke(IPC.configLanguagePath) as Promise<{ path: string }>,
    user: () => ipcRenderer.invoke(IPC.configUser) as Promise<CarloUserConfig>,
    saveUser: (config: CarloUserConfig) =>
      ipcRenderer.invoke(IPC.configUserSave, config) as Promise<CarloUserConfig>,
    userPath: () => ipcRenderer.invoke(IPC.configUserPath) as Promise<{ path: string }>,
  },
  file: {
    openDialog: () => ipcRenderer.invoke(IPC.fileOpenDialog) as Promise<OpenFileResult | null>,
    read: (path: string) => ipcRenderer.invoke(IPC.fileRead, { path }) as Promise<ReadFileResult>,
    save: (request: SaveFileRequest) =>
      ipcRenderer.invoke(IPC.fileSave, request) as Promise<{ ok: true }>,
    saveAsDialog: (request: SaveAsDialogRequest) =>
      ipcRenderer.invoke(IPC.fileSaveAsDialog, request) as Promise<SaveAsDialogResult | null>,
    create: (request: FileCreateRequest) =>
      ipcRenderer.invoke(IPC.fileCreate, request) as Promise<FileOperationResult>,
    createDirectory: (request: FileCreateRequest) =>
      ipcRenderer.invoke(IPC.fileCreateDirectory, request) as Promise<FileOperationResult>,
    delete: (request: FileDeleteRequest) =>
      ipcRenderer.invoke(IPC.fileDelete, request) as Promise<{ ok: true }>,
    copy: (request: FileCopyRequest) =>
      ipcRenderer.invoke(IPC.fileCopy, request) as Promise<FileOperationResult>,
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
    listTree: (rootPath: string, options?: { watch?: boolean; recursive?: boolean }) =>
      ipcRenderer.invoke(IPC.workspaceListTree, { rootPath, ...options }) as Promise<{
        children: FileTreeNode[];
      }>,
    search: (request: WorkspaceSearchRequest) =>
      ipcRenderer.invoke(IPC.workspaceSearch, request) as Promise<WorkspaceSearchResult>,
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
