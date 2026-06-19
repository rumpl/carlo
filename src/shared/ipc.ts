export const IPC = {
  ping: 'app:ping',
  fileOpenDialog: 'file:openDialog',
  fileRead: 'file:read',
  fileSave: 'file:save',
  fileSaveAsDialog: 'file:saveAsDialog',
  workspaceOpenFolderDialog: 'workspace:openFolderDialog',
  menuCommand: 'menu:command',
  themeOsChanged: 'theme:osChanged',
  lspStart: 'lsp:start',
  lspStop: 'lsp:stop',
  lspToServer: 'lsp:toServer',
  lspFromServer: 'lsp:fromServer',
  lspServerExit: 'lsp:serverExit',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
