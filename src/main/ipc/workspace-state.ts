import { BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import { IPC } from '@shared/ipc';
import { ignoredWatchNames, isIgnoredPath } from './ignored-paths';

interface WindowWorkspaceState {
  initialRootPath?: string;
  watcher?: FSWatcher;
  watchedRootPath?: string;
}

const windowWorkspaceStates = new Map<number, WindowWorkspaceState>();

export function windowFromEvent(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error('Window not found');
  return win;
}

export function workspaceStateFor(win: BrowserWindow): WindowWorkspaceState {
  let state = windowWorkspaceStates.get(win.webContents.id);
  if (!state) {
    state = {};
    windowWorkspaceStates.set(win.webContents.id, state);
  }
  return state;
}

export function registerWindowWorkspace(win: BrowserWindow, initialRootPath?: string): void {
  const webContentsId = win.webContents.id;
  windowWorkspaceStates.set(webContentsId, { initialRootPath });
  win.on('closed', () => {
    const state = windowWorkspaceStates.get(webContentsId);
    state?.watcher?.close();
    windowWorkspaceStates.delete(webContentsId);
  });
}

export function ensureWorkspaceWatcher(win: BrowserWindow, rootPath: string): void {
  const state = workspaceStateFor(win);
  if (state.watchedRootPath === rootPath && state.watcher) return;
  state.watcher?.close();
  state.watchedRootPath = rootPath;
  try {
    state.watcher = watch(rootPath, { recursive: true }, (eventType, filename) => {
      const relativePath = filename?.toString();
      if (relativePath && isIgnoredPath(relativePath, ignoredWatchNames)) return;
      const path = relativePath ? join(rootPath, relativePath) : undefined;
      win.webContents.send(IPC.workspaceChanged, { rootPath, path, eventType });
    });
    state.watcher.on('error', (error) => console.error('workspace watcher failed', error));
  } catch (error) {
    state.watcher = undefined;
    console.error('failed to watch workspace', error);
  }
}
