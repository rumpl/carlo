import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron';
import { IPC } from '@shared/ipc';

const closeConfirmedWindowIds = new Set<number>();
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

const minZoomLevel = -4;
const maxZoomLevel = 5;
const zoomStep = 0.5;

function clamp(value: number): number {
  return Math.min(maxZoomLevel, Math.max(minZoomLevel, value));
}

export function shouldAllowWindowClose(win: BrowserWindow): boolean {
  return closeConfirmedWindowIds.has(win.webContents.id);
}

export function requestWindowCloseConfirmation(win: BrowserWindow): void {
  win.webContents.send(IPC.windowCloseRequested);
}

export function forgetWindowCloseState(webContentsId: number): void {
  closeConfirmedWindowIds.delete(webContentsId);
}

const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:']);

interface ShellOpenExternalRequest {
  url: string;
}

export function safeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  try {
    decodeURI(value);
    const url = new URL(value);
    return allowedExternalProtocols.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function registerWindowHandlers(): void {
  ipcMain.handle(IPC.windowZoomIn, (event) => {
    const nextZoomLevel = clamp(event.sender.getZoomLevel() + zoomStep);
    event.sender.setZoomLevel(nextZoomLevel);
    return { zoomLevel: nextZoomLevel };
  });

  ipcMain.handle(IPC.windowZoomOut, (event) => {
    const nextZoomLevel = clamp(event.sender.getZoomLevel() - zoomStep);
    event.sender.setZoomLevel(nextZoomLevel);
    return { zoomLevel: nextZoomLevel };
  });

  ipcMain.handle(IPC.windowZoomReset, (event) => {
    event.sender.setZoomLevel(0);
    return { zoomLevel: 0 };
  });

  ipcMain.handle(IPC.dialogUnsavedChanges, async (event, { name }: { name: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options = {
      type: 'warning' as const,
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      message: `Do you want to save changes to ${name}?`,
      detail: 'Your changes will be lost if you discard them.',
    };
    const result = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options);
    if (result.response === 0) return 'save';
    if (result.response === 1) return 'discard';
    return 'cancel';
  });

  ipcMain.handle(IPC.windowCloseProceed, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      closeConfirmedWindowIds.add(win.webContents.id);
      if (isQuitting) app.quit();
      else win.close();
    }
    return { ok: true };
  });

  ipcMain.handle(IPC.windowCloseCancel, () => {
    isQuitting = false;
    return { ok: true };
  });

  ipcMain.handle(IPC.shellOpenExternal, async (_event, request: ShellOpenExternalRequest) => {
    const url = safeExternalUrl(request?.url);
    if (!url) return { ok: false as const, error: 'Unsupported external URL.' };

    await shell.openExternal(url);
    return { ok: true as const };
  });
}
