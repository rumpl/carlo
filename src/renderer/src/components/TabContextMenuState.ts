import type { EditorTab } from '../store/useEditorStore';

export interface TabContextMenuState {
  x: number;
  y: number;
  tab: EditorTab;
}
