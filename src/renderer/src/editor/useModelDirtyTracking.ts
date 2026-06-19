import { useEffect } from 'react';
import * as monaco from '@codingame/monaco-vscode-editor-api';
import { useEditorStore } from '../store/useEditorStore';
import { getEditorForGroup } from './editorRegistry';
import { updateGitGutter } from './gitGutter';
import { getModel, isApplyingExternalContentUpdate } from './models';

export function useModelDirtyTracking({
  groupId,
  activeTabId,
  editorVersion,
  markDirty,
}: {
  groupId: string;
  activeTabId: string | undefined;
  editorVersion: number;
  markDirty: (uri: string) => void;
}): void {
  useEffect(() => {
    const editor = getEditorForGroup(groupId);
    const disposables: monaco.IDisposable[] = [];
    for (const tab of useEditorStore.getState().tabs) {
      const model = getModel(tab.uri);
      if (!model) continue;
      let gitTimer: ReturnType<typeof setTimeout> | undefined;
      disposables.push(
        model.onDidChangeContent(() => {
          if (!isApplyingExternalContentUpdate(model)) markDirty(tab.uri);
          if (gitTimer) clearTimeout(gitTimer);
          gitTimer = setTimeout(() => {
            if (editor?.getModel() === model) void updateGitGutter(editor, tab);
          }, 150);
        }),
      );
      disposables.push({ dispose: () => gitTimer && clearTimeout(gitTimer) });
    }
    return () => disposables.forEach((disposable) => disposable.dispose());
  }, [groupId, activeTabId, editorVersion, markDirty]);
}
