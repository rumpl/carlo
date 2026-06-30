import type { WorkspaceFolderResult } from '@shared/file-types';
import { useWorkspaceChangeDebounce } from '../../hooks/useWorkspaceChangeDebounce';

export function useWorkspaceWatcher(
  workspace: WorkspaceFolderResult | undefined,
  reloadPreservingScroll: () => Promise<void>,
): void {
  useWorkspaceChangeDebounce(
    workspace?.rootPath,
    () => void reloadPreservingScroll().catch(console.error),
    120,
  );
}
