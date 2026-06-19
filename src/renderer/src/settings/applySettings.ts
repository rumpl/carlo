import type { CarloUserConfig } from '@shared/app-config';

export function applySettings(config: CarloUserConfig): void {
  document.documentElement.style.setProperty('--tree-view-font-family', config.treeView.fontFamily);
  void import('../editor/editorOptions')
    .then(({ setEditorFontFamily, setEditorFontSize, setEditorTabSize, setEditorWordWrap }) => {
      setEditorFontFamily(config.mainView.fontFamily);
      setEditorFontSize(config.mainView.fontSize);
      setEditorTabSize(config.mainView.tabSize);
      setEditorWordWrap(config.mainView.wordWrap);
    })
    .catch(console.error);
  void import('../editor/MonacoEditor')
    .then(({ setEditorsFontFamily, setEditorsFontSize, setEditorsSoftWrap, setEditorsTabSize }) => {
      setEditorsFontFamily(config.mainView.fontFamily);
      setEditorsFontSize(config.mainView.fontSize);
      setEditorsTabSize(config.mainView.tabSize);
      setEditorsSoftWrap(config.mainView.wordWrap);
    })
    .catch(console.error);
}
