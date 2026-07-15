import type { CarloUserConfig } from '@shared/app-config';
import { useThemeStore } from '../store/useThemeStore';
import { loadAfterVscodeServices } from '../vscode/servicesReady';

export function applySettings(config: CarloUserConfig): void {
  useThemeStore.getState().setTheme(config.theme);
  document.documentElement.style.setProperty('--tree-view-font-family', config.treeView.fontFamily);
  void loadAfterVscodeServices(() => import('../editor/editorRegistry'))
    .then(({ setEditorsFontFamily, setEditorsFontSize, setEditorsTabSize, setEditorsWordWrap }) => {
      setEditorsFontFamily(config.mainView.fontFamily);
      setEditorsFontSize(config.mainView.fontSize);
      setEditorsTabSize(config.mainView.tabSize);
      setEditorsWordWrap(config.mainView.wordWrap);
    })
    .catch(console.error);
}
