import { useEffect, useRef } from 'react';
import * as monaco from '@codingame/monaco-vscode-editor-api';
import { activeTabInGroup } from '../store/useEditorStore';
import { updateGitGutter } from './gitGutter';
import { getModel } from './models';
import {
  clearPendingReveal,
  getEditorForGroup,
  getPendingReveal,
  revealPosition,
} from './editorRegistry';

export function useActiveEditorModel({
  groupId,
  activeTabId,
  editorVersion,
}: {
  groupId: string;
  activeTabId: string | undefined;
  editorVersion: number;
}): void {
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>());
  const currentUri = useRef<string | null>(null);

  useEffect(() => {
    const editor = getEditorForGroup(groupId);
    if (!editor) return;
    const tab = activeTabInGroup(groupId);
    const actualModelUri = editor.getModel()?.uri.toString() ?? null;
    if (currentUri.current && actualModelUri === currentUri.current) {
      viewStates.current.set(currentUri.current, editor.saveViewState());
    }
    currentUri.current = tab?.uri ?? null;
    const model = tab ? (getModel(tab.uri) ?? null) : null;
    editor.setModel(model);
    requestAnimationFrame(() => editor.layout());
    if (tab) {
      editor.restoreViewState(viewStates.current.get(tab.uri) ?? null);
      const pendingReveal = getPendingReveal(groupId);
      if (pendingReveal?.uri === tab.uri) {
        revealPosition(editor, pendingReveal.position);
        clearPendingReveal(groupId);
      }
      void updateGitGutter(editor, tab);
    }
    editor.focus();
  }, [groupId, activeTabId, editorVersion]);
}
