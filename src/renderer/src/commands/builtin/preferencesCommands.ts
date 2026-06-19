import { getOrCreateModel } from '../../editor/models';
import { showThemeSelector } from '../../quickopen/themeSelector';
import { useEditorStore } from '../../store/useEditorStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { registerCommand } from '../registry';
import { titleFromPath } from './pathUtils';

async function openLanguageConfig(): Promise<void> {
  const { path } = await window.api.config.languagePath();
  await openJsonConfigFile(path);
}

async function openUserConfig(): Promise<void> {
  const { path } = await window.api.config.userPath();
  await openJsonConfigFile(path);
}

async function openJsonConfigFile(path: string): Promise<void> {
  const file = await window.api.file.read(path);
  const uri = new URL(`file://${path}`).toString();
  getOrCreateModel(uri, file.content, 'json');
  useEditorStore.getState().openFile({ uri, path, languageId: 'json', title: titleFromPath(path) });
}

function openSettings(): void {
  const settingsStore = useSettingsStore.getState();
  settingsStore.openSettings();
  void settingsStore.loadSettings().catch(console.error);
}

export function registerPreferencesCommands(): void {
  registerCommand({
    id: 'preferences.openSettings',
    title: 'Preferences: Open Settings',
    keybinding: 'Ctrl+,',
    run: openSettings,
  });
  registerCommand({
    id: 'preferences.openUserConfig',
    title: 'Preferences: Open User Config',
    run: openUserConfig,
  });
  registerCommand({
    id: 'preferences.openLanguageConfig',
    title: 'Preferences: Open Language Config',
    run: openLanguageConfig,
  });
  registerCommand({
    id: 'workbench.action.selectTheme',
    title: 'Preferences: Color Theme',
    run: showThemeSelector,
  });
}
