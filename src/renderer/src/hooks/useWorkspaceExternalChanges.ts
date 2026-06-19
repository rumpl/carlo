import { useEffect } from 'react';
import { refreshVisibleGitGutters, refreshVisibleGitGuttersForPath } from '../editor/MonacoEditor';
import { invalidateAllGitBaselines } from '../editor/gitGutter';
import { getModel, replaceModelContentFromDisk } from '../editor/models';
import { useEditorStore } from '../store/useEditorStore';

function isGitMetadataPath(path: string): boolean {
  return path.split(/[\\/]/).includes('.git');
}

export function useWorkspaceExternalChanges(): void {
  useEffect(
    () =>
      window.api.workspace.onChanged(async ({ path }) => {
        if (!path) {
          refreshVisibleGitGutters();
          return;
        }

        if (isGitMetadataPath(path)) {
          invalidateAllGitBaselines();
          refreshVisibleGitGutters();
          return;
        }

        const tabs = useEditorStore.getState().tabs.filter((tab) => tab.path === path);
        await Promise.all(
          tabs.map(async (tab) => {
            const model = getModel(tab.uri);
            if (!model || tab.dirty) return;
            try {
              const file = await window.api.file.read(tab.path);
              replaceModelContentFromDisk(model, file.content);
            } catch (error) {
              console.error('failed to reload externally changed file', error);
            }
          }),
        );
        refreshVisibleGitGuttersForPath(path);
      }),
    [],
  );
}
