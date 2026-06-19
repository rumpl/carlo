import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { IPC } from '@shared/ipc';

export function installAppMenu(): void {
  const sendCommand = (commandId: string) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().at(-1);
    win?.webContents.send(IPC.menuCommand, { commandId });
  };
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Open File…', accelerator: 'CmdOrCtrl+O', click: () => sendCommand('file.open') },
        {
          label: 'Open Folder…',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendCommand('workspace.openFolder'),
        },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('file.save') },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendCommand('file.saveAs'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Rename Symbol',
          accelerator: 'F2',
          click: () => sendCommand('editor.action.rename'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Command Palette…',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => sendCommand('workbench.action.showCommands'),
        },
        {
          label: 'Find in Files…',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendCommand('workbench.action.findInFiles'),
        },
        {
          label: 'Problems',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => sendCommand('workbench.panel.problems.toggle'),
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Preferences',
      submenu: [
        {
          label: 'Settings…',
          accelerator: 'CmdOrCtrl+,',
          click: () => sendCommand('preferences.openSettings'),
        },
        {
          label: 'Open User Config',
          click: () => sendCommand('preferences.openUserConfig'),
        },
        {
          label: 'Open Language Config',
          click: () => sendCommand('preferences.openLanguageConfig'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
