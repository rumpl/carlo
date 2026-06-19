import { useEffect } from 'react';
import type { WorkspaceFolderResult } from '@shared/file-types';

export function useWorkspaceWatcher(
  workspace: WorkspaceFolderResult | undefined,
  reloadPreservingScroll: () => Promise<void>,
): void {
  useEffect(() => {
    if (!workspace) return;
    let timer: number | undefined;
    const unsubscribe = window.api.workspace.onChanged(({ rootPath }) => {
      if (rootPath !== workspace.rootPath) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void reloadPreservingScroll().catch(console.error), 120);
    });
    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [workspace, reloadPreservingScroll]);
}
