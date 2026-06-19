import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { basename } from 'node:path';
import { IPC } from '@shared/ipc';
import { languageIdFromPath } from '@shared/language-registry';
import type { OpenFileResult, SaveAsDialogRequest, SaveFileRequest } from '@shared/file-types';

export function registerFileHandlers(win: BrowserWindow): void {
  ipcMain.handle(IPC.fileOpenDialog, async (): Promise<OpenFileResult | null> => {
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0]!;
    const content = await readFile(path, 'utf8');
    return { uri: pathToFileURL(path).toString(), path, languageId: languageIdFromPath(path), content };
  });

  ipcMain.handle(IPC.fileRead, async (_event, { path }: { path: string }) => ({ content: await readFile(path, 'utf8') }));

  ipcMain.handle(IPC.fileSave, async (_event, { path, content }: SaveFileRequest) => {
    await writeFile(path, content, 'utf8');
    return { ok: true };
  });

  ipcMain.handle(IPC.fileSaveAsDialog, async (_event, request: SaveAsDialogRequest) => {
    const result = await dialog.showSaveDialog(win, { defaultPath: request.suggestedName ?? 'untitled.txt' });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, request.content, 'utf8');
    return { path: result.filePath, uri: pathToFileURL(result.filePath).toString(), languageId: languageIdFromPath(result.filePath) };
  });

  ipcMain.handle(IPC.workspaceOpenFolderDialog, async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const rootPath = result.filePaths[0]!;
    return { rootPath, rootUri: pathToFileURL(rootPath).toString(), name: basename(rootPath) };
  });
}
