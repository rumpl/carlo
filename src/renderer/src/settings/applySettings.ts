import type { CarloUserConfig } from '@shared/app-config';
import { setEditorsFontFamily } from '../editor/MonacoEditor';
import { setEditorFontFamily } from '../editor/editorOptions';

export function applySettings(config: CarloUserConfig): void {
  document.documentElement.style.setProperty('--tree-view-font-family', config.treeView.fontFamily);
  setEditorFontFamily(config.mainView.fontFamily);
  setEditorsFontFamily(config.mainView.fontFamily);
}
