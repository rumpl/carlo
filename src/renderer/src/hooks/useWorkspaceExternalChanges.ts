import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

function isGitMetadataPath(path: string): boolean {
  return path.split(/[\\/]/).includes('.git');
}

export function useWorkspaceExternalChanges(): void {
  useEffect(() => {
    const unsubscribe = window.api.workspace.onChanged(({ path }) => {
      void (async () => {
        const [{ refreshVisibleGitGutters, refreshVisibleGitGuttersForPath }, gitGutter, models] =
          await Promise.all([
            import('../editor/MonacoEditor'),
            import('../editor/gitGutter'),
            import('../editor/models'),
          ]);

        if (!path) {
          refreshVisibleGitGutters();
          return;
        }

        if (isGitMetadataPath(path)) {
          gitGutter.invalidateAllGitBaselines();
          refreshVisibleGitGutters();
          return;
        }

        const tabs = useEditorStore.getState().tabs.filter((tab) => tab.path === path);
        await Promise.all(
          tabs.map(async (tab) => {
            const model = models.getModel(tab.uri);
            if (!model || tab.dirty) return;
            try {
              const file = await window.api.file.read(tab.path);
              models.replaceModelContentFromDisk(model, file.content);
            } catch (error) {
              console.error('failed to reload externally changed file', error);
            }
          }),
        );
        refreshVisibleGitGuttersForPath(path);
      })();
    });
    return unsubscribe;
  }, []);
}
