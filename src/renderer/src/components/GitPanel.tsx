import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GitChangedFile, GitFileStatus } from '@shared/file-types';
import { openGitChanges } from '../git/diffTabs';
import { useEditorStore } from '../store/useEditorStore';
import { useGitPanelStore } from '../store/useGitPanelStore';

const statusLabels: Record<GitFileStatus, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  ignored: 'I',
  conflict: 'C',
};

const statusTitles: Record<GitFileStatus, string> = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
  renamed: 'Renamed',
  untracked: 'Untracked',
  ignored: 'Ignored',
  conflict: 'Conflict',
};

function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function directoryFromRelativePath(path: string): string | undefined {
  const slash = path.replaceAll('\\', '/').lastIndexOf('/');
  return slash >= 0 ? path.slice(0, slash) : undefined;
}

export function GitPanel() {
  const workspace = useEditorStore((state) => state.workspace);
  const closeGitPanel = useGitPanelStore((state) => state.closeGitPanel);
  const [files, setFiles] = useState<GitChangedFile[]>([]);
  const [isGitRepo, setIsGitRepo] = useState(true);
  const [loading, setLoading] = useState(false);
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
        {workspace && loading ? <div className="git-panel-empty">Loading changes…</div> : null}
        {workspace && error ? <div className="git-panel-empty git-panel-error">{error}</div> : null}
        {workspace && !loading && !error && !isGitRepo ? (
          <div className="git-panel-empty">This folder is not a git repository.</div>
        ) : null}
        {workspace && !loading && !error && isGitRepo && files.length === 0 ? (
          <div className="git-panel-empty">No changes.</div>
        ) : null}
        {workspace && !loading && !error && files.length > 0 ? (
          <ul className="git-panel-list">
            {files.map((file) => (
              <li className="git-panel-row" key={file.path} title={`${statusTitles[file.status]} · ${file.relativePath}`}>
                <button
                  className="git-panel-open"
                  type="button"
                  onClick={() => openGitChanges(file.path)}
                >
                  <span className={`git-panel-status git-${file.status}`}>{statusLabels[file.status]}</span>
                  <span className="git-panel-file">
                    <span>{titleFromPath(file.relativePath)}</span>
                    <small>{directoryFromRelativePath(file.relativePath)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
