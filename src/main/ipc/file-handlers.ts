import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { execFile } from 'node:child_process';
import { constants, watch, type FSWatcher } from 'node:fs';
import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { IPC } from '@shared/ipc';
import { languageIdFromPath } from '@shared/language-registry';
import { initialWorkspacePath } from '../workspace';
import type {
  FileCopyRequest,
  FileCreateRequest,
  FileDeleteRequest,
  FileOperationResult,
  FileTreeNode,
  GitFileStatus,
  OpenFileResult,
  SaveAsDialogRequest,
  ReadFileRequest,
  SaveFileRequest,
  WorkspaceSearchMatch,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
} from '@shared/file-types';

const ignoredNames = new Set(['.git', 'node_modules', 'out', 'dist', 'build', '.DS_Store']);
const ignoredWatchNames = new Set(['node_modules', 'out', 'dist', 'build', '.DS_Store']);

interface WindowWorkspaceState {
  initialRootPath?: string;
  watcher?: FSWatcher;
  watchedRootPath?: string;
}

const windowWorkspaceStates = new Map<number, WindowWorkspaceState>();

const execFileAsync = promisify(execFile);

function assertSafeChildName(name: string): void {
  if (!name || name === '.' || name === '..' || name !== basename(name)) {
    throw new Error('Invalid name');
  }
}

function windowFromEvent(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error('Window not found');
  return win;
}

function workspaceStateFor(win: BrowserWindow): WindowWorkspaceState {
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function uniqueCopyDestination(sourcePath: string, destinationDirectory: string): Promise<string> {
  const sourceStats = await stat(sourcePath);
  const sourceName = basename(sourcePath);
  const extension = sourceStats.isDirectory() ? '' : extname(sourceName);
  const baseName = extension ? sourceName.slice(0, -extension.length) : sourceName;

  let candidate = join(destinationDirectory, sourceName);
  if (!(await pathExists(candidate))) return candidate;

  candidate = join(destinationDirectory, `${baseName} copy${extension}`);
  if (!(await pathExists(candidate))) return candidate;

  for (let index = 2; ; index += 1) {
    candidate = join(destinationDirectory, `${baseName} copy ${index}${extension}`);
    if (!(await pathExists(candidate))) return candidate;
  }
}

function isPathInsideOrEqual(childPath: string, parentPath: string): boolean {
  const normalizedChild = normalize(childPath);
  const normalizedParent = normalize(parentPath);
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}${sep}`);
}

function operationResult(path: string): FileOperationResult {
  return { path, uri: pathToFileURL(path).toString() };
}

interface GitStatusContext {
  rootPath: string;
  statuses: Map<string, GitFileStatus>;
}

function isIgnoredWatchPath(path: string): boolean {
  return path.split(/[\\/]/).some((part) => ignoredWatchNames.has(part));
}

function ensureWorkspaceWatcher(win: BrowserWindow, rootPath: string): void {
  const state = workspaceStateFor(win);
  if (state.watchedRootPath === rootPath && state.watcher) return;
  state.watcher?.close();
  state.watchedRootPath = rootPath;
  try {
    state.watcher = watch(rootPath, (eventType, filename) => {
      const relativePath = filename?.toString();
      if (relativePath && isIgnoredWatchPath(relativePath)) return;
      const path = relativePath ? join(rootPath, relativePath) : undefined;
      win.webContents.send(IPC.workspaceChanged, { rootPath, path, eventType });
    });
    state.watcher.on('error', (error) => console.error('workspace watcher failed', error));
  } catch (error) {
    state.watcher = undefined;
    console.error('failed to watch workspace', error);
  }
}

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

function statusFromPorcelain(indexStatus: string, workTreeStatus: string): GitFileStatus | undefined {
  if (indexStatus === '!' || workTreeStatus === '!') return 'ignored';
  if (indexStatus === '?' || workTreeStatus === '?') return 'untracked';
  if (
    indexStatus === 'U' ||
    workTreeStatus === 'U' ||
    ['DD', 'AU', 'UD', 'UA', 'DU', 'AA'].includes(`${indexStatus}${workTreeStatus}`)
  ) {
    return 'conflict';
  }
  if (indexStatus === 'D' || workTreeStatus === 'D') return 'deleted';
  if (indexStatus === 'R' || workTreeStatus === 'R') return 'renamed';
  if (indexStatus === 'A' || workTreeStatus === 'A' || indexStatus === 'C' || workTreeStatus === 'C') return 'added';
  if (indexStatus === 'M' || workTreeStatus === 'M' || indexStatus === 'T' || workTreeStatus === 'T') {
    return 'modified';
  }
  return undefined;
}

function parseGitStatus(output: string, gitRootPath: string): Map<string, GitFileStatus> {
  const statuses = new Map<string, GitFileStatus>();
  const entries = output.split('\0').filter(Boolean);

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (entry.length < 4) continue;

    const status = statusFromPorcelain(entry[0]!, entry[1]!);
    if (!status) continue;

    const relativePath = entry.slice(3);
    statuses.set(join(gitRootPath, relativePath), status);

    if (entry[0] === 'R' || entry[0] === 'C') index += 1;
  }

  return statuses;
}

function normalizeGitStatusPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '');
}

function gitStatusForNode(
  path: string,
  isDirectory: boolean,
  gitStatus: GitStatusContext | undefined,
): GitFileStatus | undefined {
  const directStatus = gitStatus?.statuses.get(path);
  if (directStatus || !isDirectory || !gitStatus) return directStatus;

  const directoryPrefix = `${normalizeGitStatusPath(path)}/`;
  for (const [changedPath, changedStatus] of gitStatus.statuses) {
    if (changedStatus === 'modified' && normalizeGitStatusPath(changedPath).startsWith(directoryPrefix)) {
      return 'modified';
    }
  }

  return undefined;
}

async function getGitStatusContext(path: string): Promise<GitStatusContext | undefined> {
  try {
    const gitRootPath = (await git(['rev-parse', '--show-toplevel'], path)).trimEnd();
    const status = await git(
      ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching'],
      gitRootPath,
    );
    return { rootPath: gitRootPath, statuses: parseGitStatus(status, gitRootPath) };
  } catch {
    return undefined;
  }
}

async function listTree(
  rootPath: string,
  options: { recursive?: boolean; gitStatus?: GitStatusContext } = {},
): Promise<FileTreeNode[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const visibleEntries = entries
    .filter((entry) => !ignoredNames.has(entry.name))
    .sort((a, b) =>
      a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1,
    );

  return Promise.all(
    visibleEntries.map(async (entry) => {
      const path = join(rootPath, entry.name);
      const isDirectory = entry.isDirectory();
      return {
        name: entry.name,
        path,
        uri: pathToFileURL(path).toString(),
        type: isDirectory ? 'directory' : 'file',
        gitStatus: gitStatusForNode(path, isDirectory, options.gitStatus),
        children:
          isDirectory && options.recursive ? await listTree(path, options).catch(() => []) : undefined,
      } satisfies FileTreeNode;
    }),
  );
}

interface RgJsonMatch {
  type: 'match' | string;
  data?: {
    path?: { text?: string };
    lines?: { text?: string };
    line_number?: number;
    submatches?: { start: number; end: number }[];
  };
}

function matchResult(path: string, lineNumber: number, column: number, preview: string, matchStart: number, matchEnd: number): WorkspaceSearchMatch {
  return { path, uri: pathToFileURL(path).toString(), lineNumber, column, preview, matchStart, matchEnd };
}

function parseRipgrepJson(output: string, maxResults: number): WorkspaceSearchResult {
  const matches: WorkspaceSearchMatch[] = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    let event: RgJsonMatch;
    try {
      event = JSON.parse(line) as RgJsonMatch;
    } catch {
      continue;
    }
    if (event.type !== 'match' || !event.data) continue;
    const path = event.data.path?.text;
    const preview = event.data.lines?.text?.replace(/\r?\n$/, '');
    const lineNumber = event.data.line_number;
    if (!path || !preview || !lineNumber) continue;
    for (const submatch of event.data.submatches ?? []) {
      matches.push(matchResult(path, lineNumber, submatch.start + 1, preview, submatch.start, submatch.end));
      if (matches.length >= maxResults) return { matches, truncated: true };
    }
  }
  return { matches, truncated: false };
}

async function searchWithRipgrep({ rootPath, query, maxResults = 500 }: WorkspaceSearchRequest): Promise<WorkspaceSearchResult> {
  const args = [
    '--json',
    '--smart-case',
    '--fixed-strings',
    '--color',
    'never',
    '--glob',
    '!{.git,node_modules,out,dist,build}/**',
    '--',
    query,
    rootPath,
  ];
  try {
    const { stdout } = await execFileAsync('rg', args, {
      cwd: rootPath,
      maxBuffer: 24 * 1024 * 1024,
    });
    return parseRipgrepJson(stdout, maxResults);
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException & { stdout?: string };
    const exitCode = (error as { code?: unknown }).code;
    if (exitCode === 1 && maybeError.stdout !== undefined) {
      return parseRipgrepJson(maybeError.stdout, maxResults);
    }
    if (exitCode === 'ENOENT') throw maybeError;
    if (maybeError.stdout) return parseRipgrepJson(maybeError.stdout, maxResults);
    throw error;
  }
}

function isIgnoredSearchPath(path: string): boolean {
  return path.split(/[\\/]/).some((part) => ignoredNames.has(part));
}

async function searchFallback(rootPath: string, query: string, maxResults: number): Promise<WorkspaceSearchResult> {
  const matches: WorkspaceSearchMatch[] = [];
  const needle = query.toLowerCase();

  async function walk(path: string): Promise<void> {
    if (matches.length >= maxResults || isIgnoredSearchPath(path)) return;
    const stats = await stat(path).catch(() => undefined);
    if (!stats) return;
    if (stats.isDirectory()) {
      const entries = await readdir(path).catch(() => []);
      for (const entry of entries) await walk(join(path, entry));
      return;
    }
    if (!stats.isFile() || stats.size > 1024 * 1024) return;
    const content = await readFile(path, 'utf8').catch(() => undefined);
    if (content === undefined || content.includes('\0')) return;
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length && matches.length < maxResults; index += 1) {
      const preview = lines[index]!;
      const columnIndex = preview.toLowerCase().indexOf(needle);
      if (columnIndex === -1) continue;
      matches.push(matchResult(path, index + 1, columnIndex + 1, preview, columnIndex, columnIndex + query.length));
    }
  }

  await walk(rootPath);
  return { matches, truncated: matches.length >= maxResults };
}

async function searchWorkspace(request: WorkspaceSearchRequest): Promise<WorkspaceSearchResult> {
  const query = request.query.trim();
  const maxResults = Math.min(Math.max(request.maxResults ?? 500, 1), 2000);
  if (!query) return { matches: [], truncated: false };
  try {
    return await searchWithRipgrep({ ...request, query, maxResults });
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;
    if (maybeError.code !== 'ENOENT') console.error('workspace search failed, falling back', error);
    return searchFallback(request.rootPath, query, maxResults);
  }
}

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.fileOpenDialog, async (event): Promise<OpenFileResult | null> => {
    const win = windowFromEvent(event);
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0]!;
    const content = await readFile(path, 'utf8');
    return {
      uri: pathToFileURL(path).toString(),
      path,
      languageId: languageIdFromPath(path),
      content,
    };
  });

  ipcMain.handle(IPC.fileRead, async (_event, { path }: ReadFileRequest) => ({
    content: await readFile(path, 'utf8'),
  }));

  ipcMain.handle(IPC.fileSave, async (_event, { path, content }: SaveFileRequest) => {
    await writeFile(path, content, 'utf8');
    return { ok: true };
  });

  ipcMain.handle(IPC.fileSaveAsDialog, async (event, request: SaveAsDialogRequest) => {
    const win = windowFromEvent(event);
    const result = await dialog.showSaveDialog(win, {
      defaultPath: request.suggestedName ?? 'untitled.txt',
    });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, request.content, 'utf8');
    return {
      path: result.filePath,
      uri: pathToFileURL(result.filePath).toString(),
      languageId: languageIdFromPath(result.filePath),
    };
  });

  ipcMain.handle(IPC.fileCreate, async (_event, { parentPath, name }: FileCreateRequest) => {
    assertSafeChildName(name);
    const path = join(parentPath, name);
    await writeFile(path, '', { encoding: 'utf8', flag: 'wx' });
    return operationResult(path);
  });

  ipcMain.handle(IPC.fileCreateDirectory, async (_event, { parentPath, name }: FileCreateRequest) => {
    assertSafeChildName(name);
    const path = join(parentPath, name);
    await mkdir(path);
    return operationResult(path);
  });

  ipcMain.handle(IPC.fileDelete, async (_event, { path }: FileDeleteRequest) => {
    await rm(path, { recursive: true, force: false });
    return { ok: true };
  });

  ipcMain.handle(IPC.fileCopy, async (_event, { sourcePath, destinationDirectory }: FileCopyRequest) => {
    const sourceStats = await stat(sourcePath);
    if (sourceStats.isDirectory() && isPathInsideOrEqual(destinationDirectory, sourcePath)) {
      throw new Error('Cannot copy a folder into itself');
    }
    const destinationPath = await uniqueCopyDestination(sourcePath, destinationDirectory);
    await cp(sourcePath, destinationPath, { recursive: sourceStats.isDirectory(), errorOnExist: true, force: false });
    return operationResult(destinationPath);
  });

  ipcMain.handle(IPC.workspaceOpenFolderDialog, async (event) => {
    const win = windowFromEvent(event);
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const rootPath = result.filePaths[0]!;
    workspaceStateFor(win).initialRootPath = rootPath;
    ensureWorkspaceWatcher(win, rootPath);
    return { rootPath, rootUri: pathToFileURL(rootPath).toString(), name: basename(rootPath) };
  });

  ipcMain.handle(IPC.workspaceCurrentFolder, async (event) => {
    const win = windowFromEvent(event);
    const rootPath = workspaceStateFor(win).initialRootPath ?? initialWorkspacePath();
    ensureWorkspaceWatcher(win, rootPath);
    return { rootPath, rootUri: pathToFileURL(rootPath).toString(), name: basename(rootPath) };
  });

  ipcMain.handle(
    IPC.workspaceListTree,
    async (
      event,
      {
        rootPath,
        watch: shouldWatch = true,
        recursive = false,
        gitStatus = true,
      }: { rootPath: string; watch?: boolean; recursive?: boolean; gitStatus?: boolean },
    ) => {
      const win = windowFromEvent(event);
      if (shouldWatch) ensureWorkspaceWatcher(win, rootPath);
      return {
        children: await listTree(rootPath, {
          recursive,
          gitStatus: gitStatus ? await getGitStatusContext(rootPath) : undefined,
        }),
      };
    },
  );

  ipcMain.handle(IPC.workspaceSearch, async (_event, request: WorkspaceSearchRequest) => searchWorkspace(request));
}
