import type { CarloUserConfig } from '@shared/app-config';

export function applySettings(config: CarloUserConfig): void {
  document.documentElement.style.setProperty('--tree-view-font-family', config.treeView.fontFamily);
  void import('../editor/editorOptions')
    .then(({ setEditorFontFamily }) => setEditorFontFamily(config.mainView.fontFamily))
    .catch(console.error);
  void import('../editor/MonacoEditor')
    .then(({ setEditorsFontFamily }) => setEditorsFontFamily(config.mainView.fontFamily))
    .catch(console.error);
}
