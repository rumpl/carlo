import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useWorkspaceChangeDebounce } from '../hooks/useWorkspaceChangeDebounce';
import type { GitChangedFile, GitFileStatus } from '@shared/file-types';
import { useEditorStore } from '../store/useEditorStore';
import { useGitPanelStore } from '../store/useGitPanelStore';
import { GitFileList } from './GitFileList';
import { statusLabels } from '../git/gitStatusMaps';

// ---------------------------------------------------------------------------
// Reducer-style state for all mutable git-panel data
// ---------------------------------------------------------------------------

interface GitPanelState {
  files: GitChangedFile[];
  isGitRepo: boolean;
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
}

type GitPanelAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; files: GitChangedFile[]; isGitRepo: boolean }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'NO_WORKSPACE' };

const initialState: GitPanelState = {
  files: [],
  isGitRepo: false,
  loading: false,
  hasFetched: false,
  error: null,
};

function reducer(state: GitPanelState, action: GitPanelAction): GitPanelState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { files: action.files, isGitRepo: action.isGitRepo, loading: false, hasFetched: true, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, hasFetched: true, error: action.error };
    case 'NO_WORKSPACE':
      return { files: [], isGitRepo: false, loading: false, hasFetched: true, error: null };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------

export function GitPanel() {
  const workspace = useEditorStore((state) => state.workspace);
  const closeGitPanel = useGitPanelStore((state) => state.closeGitPanel);

  const [{ files, isGitRepo, loading, hasFetched, error }, dispatch] = useReducer(reducer, initialState);

  const counts = useMemo(() => {
    const result = new Map<GitFileStatus, number>();
    for (const file of files) result.set(file.status, (result.get(file.status) ?? 0) + 1);
    return result;
  }, [files]);

  const refresh = useCallback(async (): Promise<void> => {
    const currentWorkspace = useEditorStore.getState().workspace;
    if (!currentWorkspace) {
      dispatch({ type: 'NO_WORKSPACE' });
      return;
    }
    dispatch({ type: 'FETCH_START' });
    try {
      const result = await window.api.git.status(currentWorkspace.rootPath);
      dispatch({ type: 'FETCH_SUCCESS', files: result.files, isGitRepo: result.isGitRepo });
    } catch (refreshError) {
      console.error(refreshError);
      dispatch({
        type: 'FETCH_ERROR',
        error: refreshError instanceof Error ? refreshError.message : 'Could not load git status',
      });
    }
  }, []);

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
