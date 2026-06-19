import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { basename, join } from 'node:path';
import { IPC } from '@shared/ipc';
import { languageIdFromPath } from '@shared/language-registry';
import { initialWorkspacePath } from '../workspace';
import type {
  FileTreeNode,
  OpenFileResult,
  SaveAsDialogRequest,
  SaveFileRequest,
} from '@shared/file-types';

const ignoredNames = new Set(['.git', 'node_modules', 'out', 'dist', 'build', '.DS_Store']);

async function listTree(rootPath: string, depth = 0): Promise<FileTreeNode[]> {
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
        children:
          isDirectory && depth < 8 ? await listTree(path, depth + 1).catch(() => []) : undefined,
      } satisfies FileTreeNode;
    }),
  );
}

export function registerFileHandlers(win: BrowserWindow): void {
  ipcMain.handle(IPC.fileOpenDialog, async (): Promise<OpenFileResult | null> => {
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

  ipcMain.handle(IPC.fileRead, async (_event, { path }: { path: string }) => ({
    content: await readFile(path, 'utf8'),
  }));

  ipcMain.handle(IPC.fileSave, async (_event, { path, content }: SaveFileRequest) => {
    await writeFile(path, content, 'utf8');
    return { ok: true };
  });

  ipcMain.handle(IPC.fileSaveAsDialog, async (_event, request: SaveAsDialogRequest) => {
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

  ipcMain.handle(IPC.workspaceOpenFolderDialog, async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const rootPath = result.filePaths[0]!;
    return { rootPath, rootUri: pathToFileURL(rootPath).toString(), name: basename(rootPath) };
  });

  ipcMain.handle(IPC.workspaceCurrentFolder, async () => {
    const rootPath = initialWorkspacePath();
    return { rootPath, rootUri: pathToFileURL(rootPath).toString(), name: basename(rootPath) };
  });

  ipcMain.handle(IPC.workspaceListTree, async (_event, { rootPath }: { rootPath: string }) => ({
    children: await listTree(rootPath),
  }));
}
