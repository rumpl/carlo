import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GitChangedFile, GitFileStatus } from '@shared/file-types';
import { useEditorStore } from '../store/useEditorStore';
import { useGitPanelStore } from '../store/useGitPanelStore';
import { GitFileList } from './GitFileList';

const statusLabels: Record<GitFileStatus, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  ignored: 'I',
  conflict: 'C',
};

export function GitPanel() {
  const workspace = useEditorStore((state) => state.workspace);
  const closeGitPanel = useGitPanelStore((state) => state.closeGitPanel);
  const [files, setFiles] = useState<GitChangedFile[]>([]);
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counts = useMemo(() => {
    const result = new Map<GitFileStatus, number>();
    for (const file of files) result.set(file.status, (result.get(file.status) ?? 0) + 1);
    return result;
  }, [files]);

  const refresh = useCallback(async (): Promise<void> => {
    const currentWorkspace = useEditorStore.getState().workspace;
    if (!currentWorkspace) {
      setFiles([]);
      setIsGitRepo(false);
      setHasFetched(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.git.status(currentWorkspace.rootPath);
      setIsGitRepo(result.isGitRepo);
      setFiles(result.files);
    } catch (refreshError) {
      console.error(refreshError);
      setError(refreshError instanceof Error ? refreshError.message : 'Could not load git status');
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [workspace?.rootPath, refresh]);

  useEffect(() => {
    if (!workspace) return;
    let timer: number | undefined;
    const unsubscribe = window.api.workspace.onChanged(({ rootPath }) => {
      if (rootPath !== workspace.rootPath) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 180);
    });
    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [workspace?.rootPath, refresh]);

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
