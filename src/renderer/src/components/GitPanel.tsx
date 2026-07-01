import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspaceChangeDebounce } from '../hooks/useWorkspaceChangeDebounce';
import type { GitChangedFile, GitFileStatus } from '@shared/file-types';
import { useEditorStore } from '../store/useEditorStore';
import { useBottomPanelStore } from '../store/useBottomPanelStore';
import { GitFileList } from './GitFileList';
import { statusLabels } from '../git/gitStatusMaps';

export function GitPanel() {
  const workspace = useEditorStore((state) => state.workspace);
  const closeGitPanel = useCallback(() => useBottomPanelStore.getState().closePanel(), []);

  const [state, setState] = useState<{
    files: GitChangedFile[];
    isGitRepo: boolean;
    loading: boolean;
    hasFetched: boolean;
    error: string | null;
  }>({ files: [], isGitRepo: false, loading: false, hasFetched: false, error: null });

  const { files, isGitRepo, loading, hasFetched, error } = state;

  const counts = useMemo(() => {
    const result = new Map<GitFileStatus, number>();
    for (const file of files) result.set(file.status, (result.get(file.status) ?? 0) + 1);
    return result;
  }, [files]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!workspace) {
      setState({ files: [], isGitRepo: false, loading: false, hasFetched: true, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await window.api.git.status(workspace.rootPath);
      setState({ files: result.files, isGitRepo: result.isGitRepo, loading: false, hasFetched: true, error: null });
    } catch (refreshError) {
      console.error(refreshError);
      setState((prev) => ({
        ...prev,
        loading: false,
        hasFetched: true,
        error: refreshError instanceof Error ? refreshError.message : 'Could not load git status',
      }));
    }
  }, [workspace]);

  // Trigger a full refresh whenever the active workspace changes (covers initial
  // mount as well as switching to a different folder).
  useEffect(() => {
    void refresh();
  }, [workspace?.rootPath, refresh]);

  useWorkspaceChangeDebounce(workspace?.rootPath, () => void refresh(), 180);

  return (
    <section className="git-panel" aria-label="Git changes">
      <header className="git-panel-header">
        <div className="git-panel-title">Source Control</div>
        <div className="git-panel-summary">
          {files.length} changed file{files.length === 1 ? '' : 's'}
          {[...counts.entries()].map(([status, count]) => (
            <span className={`git-panel-count git-${status}`} key={status}>{statusLabels[status]} {count}</span>
          ))}
        </div>
        <button className="git-panel-close" type="button" onClick={closeGitPanel} title="Close Source Control">
          ×
        </button>
      </header>
      <div className="git-panel-body">
        {!workspace ? <div className="git-panel-empty">Open a folder to show source control.</div> : null}
        {workspace && (loading || !hasFetched) ? <div className="git-panel-empty">Loading changes…</div> : null}
        {workspace && hasFetched && !loading && error ? <div className="git-panel-empty git-panel-error">{error}</div> : null}
        {workspace && hasFetched && !loading && !error && !isGitRepo ? (
          <div className="git-panel-empty">This folder is not a git repository.</div>
        ) : null}
        {workspace && hasFetched && !loading && !error && isGitRepo && files.length === 0 ? (
          <div className="git-panel-empty">No changes.</div>
        ) : null}
        {workspace && hasFetched && !loading && !error && files.length > 0 ? (
          <GitFileList files={files} />
        ) : null}
      </div>
    </section>
  );
}
