import { dialog, ipcMain } from 'electron';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { IPC } from '@shared/ipc';
import { languageIdFromPath } from '@shared/language-registry';
import { initialWorkspacePath } from '../workspace';
import {
  assertSafeChildName,
  isPathInsideOrEqual,
  operationResult,
  uniqueCopyDestination,
} from './file-operations';
import { getGitStatusContext } from './git-status';
import { searchWorkspace } from './workspace-search';
import { ensureWorkspaceWatcher, windowFromEvent, workspaceStateFor } from './workspace-state';
import { listTree } from './workspace-tree';
import type {
  FileCopyRequest,
  FileCreateRequest,
  FileDeleteRequest,
  OpenFileResult,
  ReadFileRequest,
  SaveAsDialogRequest,
  SaveFileRequest,
  WorkspaceSearchRequest,
} from '@shared/file-types';

export { registerWindowWorkspace } from './workspace-state';

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
