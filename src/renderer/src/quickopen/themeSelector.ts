import { getService, IQuickInputService } from '@codingame/monaco-vscode-api/services';
import type { IQuickPickItem } from '@codingame/monaco-vscode-api/vscode/vs/platform/quickinput/common/quickInput';
import { useSettingsStore } from '../store/useSettingsStore';
import { THEMES, type ThemeId, useThemeStore } from '../store/useThemeStore';

interface ThemeItem extends IQuickPickItem {
  themeId: ThemeId;
}

export async function showThemeSelector(): Promise<void> {
  const currentTheme = useThemeStore.getState().themeId;
  let selectedTheme = currentTheme;
  let accepted = false;
  const quickInputService = await getService(IQuickInputService);
  const picker = quickInputService.createQuickPick<ThemeItem>();

  picker.placeholder = 'Select Color Theme';
  picker.matchOnDescription = true;
  picker.items = THEMES.map((theme) => ({
    label: theme.label,
    description: theme.kind,
    detail: theme.id === currentTheme ? 'Current theme' : undefined,
    picked: theme.id === currentTheme,
    themeId: theme.id,
  }));

  const disposables = [
    picker.onDidChangeActive((items) => {
      const item = items[0];
      if (!item) return;
      selectedTheme = item.themeId;
      useThemeStore.getState().setTheme(selectedTheme);
    }),
    picker.onDidAccept(() => {
      accepted = true;
      const settingsStore = useSettingsStore.getState();
      void settingsStore.saveSettings({ ...settingsStore.config, theme: selectedTheme }).catch(console.error);
      picker.hide();
    }),
    picker.onDidHide(() => {
      if (!accepted) useThemeStore.getState().setTheme(currentTheme);
      disposables.forEach((disposable) => disposable.dispose());
      picker.dispose();
    }),
  ];

  picker.show();
}
