import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc';
import { getLanguageConfig } from '@shared/language-registry';
import { languageConfigPath } from '../config/language-config';

export function registerConfigHandlers(): void {
  ipcMain.handle(IPC.configLanguage, () => getLanguageConfig());
  ipcMain.handle(IPC.configLanguagePath, () => ({ path: languageConfigPath() }));
}
