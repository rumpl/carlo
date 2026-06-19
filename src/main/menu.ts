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
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => sendCommand('file.new') },
        { label: 'Open File…', accelerator: 'CmdOrCtrl+O', click: () => sendCommand('file.open') },
        {
          label: 'Open Folder…',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendCommand('workspace.openFolder'),
        },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('file.save') },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+Alt+S',
          click: () => sendCommand('file.saveAll'),
        },
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
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => sendCommand('actions.find') },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => sendCommand('editor.action.startFindReplaceAction'),
        },
        {
          label: 'Find Next',
          accelerator: 'F3',
          click: () => sendCommand('editor.action.nextMatchFindAction'),
        },
        {
          label: 'Find Previous',
          accelerator: 'Shift+F3',
          click: () => sendCommand('editor.action.previousMatchFindAction'),
        },
        { type: 'separator' },
        {
          label: 'Rename Symbol',
          accelerator: 'F2',
          click: () => sendCommand('editor.action.rename'),
        },
        {
          label: 'Quick Fix…',
          accelerator: 'CmdOrCtrl+.',
          click: () => sendCommand('editor.action.quickFix'),
        },
        {
          label: 'Source Action…',
          click: () => sendCommand('editor.action.sourceAction'),
        },
      ],
    },
    {
      label: 'Source Control',
      submenu: [
        {
          label: 'Show Changes',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => sendCommand('workbench.panel.git.toggle'),
        },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Go to Definition',
          accelerator: 'F12',
          click: () => sendCommand('editor.action.revealDefinition'),
        },
        {
          label: 'Peek Definition',
          accelerator: 'Alt+F12',
          click: () => sendCommand('editor.action.peekDefinition'),
        },
        {
          label: 'Find References',
          accelerator: 'Shift+F12',
          click: () => sendCommand('editor.action.referenceSearch.trigger'),
        },
        {
          label: 'Go to Implementation',
          click: () => sendCommand('editor.action.goToImplementation'),
        },
        {
          label: 'Go to Type Definition',
          click: () => sendCommand('editor.action.goToTypeDefinition'),
        },
        { type: 'separator' },
        {
          label: 'Go Back',
          accelerator: 'CmdOrCtrl+[',
          click: () => sendCommand('workbench.action.navigateBack'),
        },
        {
          label: 'Go Forward',
          accelerator: 'CmdOrCtrl+]',
          click: () => sendCommand('workbench.action.navigateForward'),
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
