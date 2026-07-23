import { BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { watch, type FSWatcher } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { IPC } from '@shared/ipc';
import { initialWorkspacePath } from '../workspace';
import { ignoredWatchNames, isIgnoredPath } from './ignored-paths';

interface WindowWorkspaceState {
  initialRootPath: string;
  allowedRoots: Set<string>;
  allowedFiles: Set<string>;
  watcher?: FSWatcher;
  watchedRootPath?: string;
}

interface AuthorizePathOptions {
  allowMissing?: boolean;
}

const windowWorkspaceStates = new Map<number, WindowWorkspaceState>();
const unauthorizedPathMessage = 'This file or folder is not available in the current window.';

export function windowFromEvent(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error('Window not found');
  return win;
}

function createWorkspaceState(rootPath: string): WindowWorkspaceState {
  const normalizedRoot = resolve(rootPath);
  return {
    initialRootPath: normalizedRoot,
    allowedRoots: new Set([normalizedRoot]),
    allowedFiles: new Set(),
  };
}

export function workspaceStateFor(win: BrowserWindow): WindowWorkspaceState {
  let state = windowWorkspaceStates.get(win.webContents.id);
  if (!state) {
    state = createWorkspaceState(initialWorkspacePath());
    windowWorkspaceStates.set(win.webContents.id, state);
  }
  return state;
}

export function workspaceRootFor(win: BrowserWindow): string {
  return workspaceStateFor(win).initialRootPath;
}

export function setWindowWorkspaceRoot(win: BrowserWindow, rootPath: string): void {
  const normalizedRoot = resolve(rootPath);
  const state = workspaceStateFor(win);
  state.initialRootPath = normalizedRoot;
  // Opening another folder revokes access granted by the previous workspace root.
  state.allowedRoots.clear();
  state.allowedRoots.add(normalizedRoot);
}

export async function registerAllowedFile(win: BrowserWindow, path: string): Promise<void> {
  if (!isAbsolute(path)) throw new Error(unauthorizedPathMessage);
  workspaceStateFor(win).allowedFiles.add(await canonicalPath(normalize(path), true));
}

async function canonicalPath(path: string, allowMissing: boolean): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (!allowMissing || code !== 'ENOENT') throw new Error(unauthorizedPathMessage);

    const parent = dirname(path);
    if (parent === path) throw new Error(unauthorizedPathMessage);
    return join(await canonicalPath(parent, true), basename(path));
  }
}

function isInsideOrEqual(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}${sep}`);
}

/** Resolve a renderer-provided path and ensure this window was granted access to it. */
export async function authorizeWindowPath(
  win: BrowserWindow,
  path: string,
  options: AuthorizePathOptions = {},
): Promise<string> {
  if (typeof path !== 'string' || !isAbsolute(path)) throw new Error(unauthorizedPathMessage);

  const normalizedPath = normalize(path);
  const state = workspaceStateFor(win);
  try {
    const resolvedPath = await canonicalPath(normalizedPath, options.allowMissing ?? false);
    const roots = await Promise.all(
      [...state.allowedRoots].map((root) => canonicalPath(root, false)),
    );
    if (roots.some((root) => isInsideOrEqual(resolvedPath, root))) return resolvedPath;

    for (const file of state.allowedFiles) {
      if (resolvedPath === file) return resolvedPath;
    }
  } catch (error) {
    if (error instanceof Error && error.message === unauthorizedPathMessage) throw error;
  }

  throw new Error(unauthorizedPathMessage);
}

export function registerWindowWorkspace(win: BrowserWindow, initialRootPath?: string): void {
  const webContentsId = win.webContents.id;
  windowWorkspaceStates.set(
    webContentsId,
    createWorkspaceState(initialRootPath ?? initialWorkspacePath()),
  );
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
