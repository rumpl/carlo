import { dialog, ipcMain, shell } from 'electron';
import { cp, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { IPC } from '@shared/ipc';
import { languageIdFromPath } from '@shared/language-registry';
import {
  assertSafeChildName,
  isPathInsideOrEqual,
  operationResult,
  pathExists,
  uniqueCopyDestination,
} from './file-operations';
import { getGitStatusContext } from './git-status';
import { searchWorkspace } from './workspace-search';
import {
  authorizeWindowPath,
  ensureWorkspaceWatcher,
  registerAllowedFile,
  setWindowWorkspaceRoot,
  windowFromEvent,
  workspaceRootFor,
} from './workspace-state';
import { listTree } from './workspace-tree';
import type {
  FileCopyRequest,
  FileCreateRequest,
  FileDeleteRequest,
  FileRenameRequest,
  OpenFileResult,
  ReadFileRequest,
  SaveAsDialogRequest,
  SaveFileRequest,
  WorkspaceSearchRequest,
} from '@shared/file-types';

export { registerWindowWorkspace } from './workspace-state';

const imageMimeTypes: Record<string, string> = {
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const maxImageFileSize = 10 * 1024 * 1024;

function mimeTypeForPath(path: string): string | undefined {
  return imageMimeTypes[extname(path).toLowerCase()];
}

async function readImageDataUrl(path: string): Promise<string> {
  const mimeType = mimeTypeForPath(path);
  if (!mimeType) throw new Error('Unsupported image type');

  const file = await open(path, 'r');
  try {
    const fileStats = await file.stat();
    if (!fileStats.isFile()) throw new Error('Image path is not a file');
    if (fileStats.size > maxImageFileSize) throw new Error('Image exceeds the 10 MiB size limit');
    const content = await file.readFile();
    if (content.byteLength > maxImageFileSize)
      throw new Error('Image exceeds the 10 MiB size limit');
    return `data:${mimeType};base64,${content.toString('base64')}`;
  } finally {
    await file.close();
  }
}

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.fileOpenDialog, async (event): Promise<OpenFileResult | null> => {
    const win = windowFromEvent(event);
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0]!;
    const content = await readFile(path, 'utf8');
    await registerAllowedFile(win, path);
    return {
      uri: pathToFileURL(path).toString(),
      path,
      languageId: languageIdFromPath(path),
      content,
    };
  });

  ipcMain.handle(IPC.fileRead, async (event, { path }: ReadFileRequest) => ({
    content: await readFile(await authorizeWindowPath(windowFromEvent(event), path), 'utf8'),
  }));

  ipcMain.handle(IPC.fileReadDataUrl, async (event, { path }: ReadFileRequest) => {
    const authorizedPath = await authorizeWindowPath(windowFromEvent(event), path);
    return { dataUrl: await readImageDataUrl(authorizedPath) };
  });

  ipcMain.handle(IPC.fileSave, async (event, { path, content }: SaveFileRequest) => {
    const authorizedPath = await authorizeWindowPath(windowFromEvent(event), path);
    await writeFile(authorizedPath, content, 'utf8');
    return { ok: true };
  });

  ipcMain.handle(IPC.fileSaveAsDialog, async (event, request: SaveAsDialogRequest) => {
    const win = windowFromEvent(event);
    const result = await dialog.showSaveDialog(win, {
      defaultPath: request.suggestedName ?? 'untitled.txt',
    });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, request.content, 'utf8');
    await registerAllowedFile(win, result.filePath);
    return {
      path: result.filePath,
      uri: pathToFileURL(result.filePath).toString(),
      languageId: languageIdFromPath(result.filePath),
    };
  });

  ipcMain.handle(IPC.fileCreate, async (event, { parentPath, name }: FileCreateRequest) => {
    assertSafeChildName(name);
    const authorizedParent = await authorizeWindowPath(windowFromEvent(event), parentPath);
    const path = join(authorizedParent, name);
    await writeFile(path, '', { encoding: 'utf8', flag: 'wx' });
    return operationResult(path);
  });

  ipcMain.handle(
    IPC.fileCreateDirectory,
    async (event, { parentPath, name }: FileCreateRequest) => {
      assertSafeChildName(name);
      const authorizedParent = await authorizeWindowPath(windowFromEvent(event), parentPath);
      const path = join(authorizedParent, name);
      await mkdir(path);
      return operationResult(path);
    },
  );

  ipcMain.handle(IPC.fileDelete, async (event, { path }: FileDeleteRequest) => {
    await rm(await authorizeWindowPath(windowFromEvent(event), path), {
      recursive: true,
      force: false,
    });
    return { ok: true };
  });

  ipcMain.handle(
    IPC.fileCopy,
    async (event, { sourcePath, destinationDirectory }: FileCopyRequest) => {
      const win = windowFromEvent(event);
      const authorizedSource = await authorizeWindowPath(win, sourcePath);
      const authorizedDestination = await authorizeWindowPath(win, destinationDirectory);
      const sourceStats = await stat(authorizedSource);
      if (
        sourceStats.isDirectory() &&
        isPathInsideOrEqual(authorizedDestination, authorizedSource)
      ) {
        throw new Error('Cannot copy a folder into itself');
      }
      const destinationPath = await uniqueCopyDestination(authorizedSource, authorizedDestination);
      await cp(authorizedSource, destinationPath, {
        recursive: sourceStats.isDirectory(),
        errorOnExist: true,
        force: false,
      });
      return operationResult(destinationPath);
    },
  );

  ipcMain.handle(IPC.fileRename, async (event, { path, newName }: FileRenameRequest) => {
    assertSafeChildName(newName);
    const authorizedPath = await authorizeWindowPath(windowFromEvent(event), path);
    const destinationPath = await authorizeWindowPath(
      windowFromEvent(event),
      join(dirname(authorizedPath), newName),
      { allowMissing: true },
    );
    if (await pathExists(destinationPath))
      throw new Error('A file or folder with that name already exists');
    await rename(authorizedPath, destinationPath);
    return operationResult(destinationPath);
  });

  ipcMain.handle(IPC.fileRevealInFolder, async (event, { path }: { path: string }) => {
    shell.showItemInFolder(await authorizeWindowPath(windowFromEvent(event), path));
    return { ok: true };
  });

  ipcMain.handle(IPC.workspaceOpenFolderDialog, async (event) => {
    const win = windowFromEvent(event);
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const rootPath = result.filePaths[0]!;
    setWindowWorkspaceRoot(win, rootPath);
    ensureWorkspaceWatcher(win, rootPath);
    return { rootPath, rootUri: pathToFileURL(rootPath).toString(), name: basename(rootPath) };
  });

  ipcMain.handle(IPC.workspaceCurrentFolder, async (event) => {
    const win = windowFromEvent(event);
    const rootPath = workspaceRootFor(win);
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
      const authorizedRoot = await authorizeWindowPath(win, rootPath);
      if (shouldWatch) ensureWorkspaceWatcher(win, authorizedRoot);
      return {
        children: await listTree(authorizedRoot, {
          recursive,
          gitStatus: gitStatus ? await getGitStatusContext(authorizedRoot) : undefined,
        }),
      };
    },
  );

  ipcMain.handle(IPC.workspaceSearch, async (event, request: WorkspaceSearchRequest) => {
    const win = windowFromEvent(event);
    const rootPath = await authorizeWindowPath(win, workspaceRootFor(win));
    return searchWorkspace(rootPath, request);
  });
}
