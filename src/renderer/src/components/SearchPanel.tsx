import { useEffect, useMemo, useRef } from 'react';
import type { WorkspaceSearchMatch } from '@shared/file-types';
import { useEditorStore } from '../store/useEditorStore';
import { useSearchStore } from '../store/useSearchStore';
import { openFileByPath } from '../editor/openFileByPath';
import { HighlightedPreview } from './HighlightedPreview';

function relativePath(path: string, rootPath: string | undefined): string {
  if (!rootPath) return path;
  const normalizedRoot = rootPath.replaceAll('\\', '/').replace(/\/+$/, '');
  const normalizedPath = path.replaceAll('\\', '/');
  return normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : path;
}

async function openSearchResult(result: WorkspaceSearchMatch): Promise<void> {
  const [{ getEditor, revealPosition, setPendingReveal }, { useEditorStore: editorStore }] = await Promise.all([
    import('../editor/editorRegistry'),
    import('../store/useEditorStore'),
  ]);
  const position = { lineNumber: result.lineNumber, column: result.column };
  setPendingReveal(editorStore.getState().activeGroupId, result.uri, position);
  await openFileByPath(result.path, result.uri);
  requestAnimationFrame(() => {
    const editor = getEditor();
    if (editor?.getModel()?.uri.toString() === result.uri) revealPosition(editor, position);
  });
}

export function SearchPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchSeq = useRef(0);
  const workspace = useEditorStore((state) => state.workspace);
  const query = useSearchStore((state) => state.query);
  const results = useSearchStore((state) => state.results);
  const loading = useSearchStore((state) => state.loading);
  const truncated = useSearchStore((state) => state.truncated);
  const error = useSearchStore((state) => state.error);
  const hasSearched = useSearchStore((state) => state.hasSearched);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setLoading = useSearchStore((state) => state.setLoading);
  const setResults = useSearchStore((state) => state.setResults);
  const setError = useSearchStore((state) => state.setError);
  const groupedResults = useMemo(() => {
    const groups = new Map<string, WorkspaceSearchMatch[]>();
    for (const result of results) {
      const group = groups.get(result.path) ?? [];
      group.push(result);
      groups.set(result.path, group);
    }
    return [...groups.entries()];
  }, [results]);

  useEffect(() => {
    const handle = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, []);

  async function runSearch(searchQuery = query, seq = ++searchSeq.current): Promise<void> {
    const trimmedQuery = searchQuery.trim();
    if (!workspace || !trimmedQuery) {
      setLoading(false);
      setError(null);
      setResults([], false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.workspace.search({
        rootPath: workspace.rootPath,
        query: trimmedQuery,
        maxResults: 500,
      });
      if (seq === searchSeq.current) setResults(result.matches, result.truncated);
    } catch (searchError) {
      if (seq !== searchSeq.current) return;
      console.error(searchError);
      setError(searchError instanceof Error ? searchError.message : 'Search failed');
    } finally {
      if (seq === searchSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    const seq = ++searchSeq.current;
    if (!query.trim()) {
      setLoading(false);
      setError(null);
      setResults([], false);
      return;
    }
    const handle = window.setTimeout(() => void runSearch(query, seq), 250);
    return () => window.clearTimeout(handle);
  }, [query, workspace?.rootPath]);

  return (
    <section className="search-panel" aria-label="Search">
      <header className="search-header">
        <div className="search-title">Search</div>
        <form className="search-form" onSubmit={(event) => {
          event.preventDefault();
          void runSearch();
        }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find in files"
            spellCheck={false}
          />
          <button type="submit" disabled={loading || !workspace}>Search</button>
        </form>
        <button className="search-close" type="button" onClick={closeSearch} title="Close Search">
          ×
        </button>
      </header>
      <div className="search-body">
        {!workspace ? <div className="search-empty">Open a folder to search files.</div> : null}
        {workspace && loading ? <div className="search-empty">Searching…</div> : null}
        {workspace && error ? <div className="search-empty search-error">{error}</div> : null}
        {workspace && !loading && !error && hasSearched && query.trim() && results.length === 0 ? (
          <div className="search-empty">No results found.</div>
        ) : null}
        {workspace && !loading && !error && results.length > 0 ? (
          <>
            <div className="search-summary">
              {results.length} result{results.length === 1 ? '' : 's'} in {groupedResults.length} file{groupedResults.length === 1 ? '' : 's'}
              {truncated ? ' (truncated)' : ''}
            </div>
            {groupedResults.map(([path, fileResults]) => (
              <section className="search-file" key={path}>
                <div className="search-file-title" title={path}>
                  {relativePath(path, workspace.rootPath)}
                  <span>{fileResults.length}</span>
                </div>
                <ul>
                  {fileResults.map((result) => (
                    <li key={`${result.path}:${result.lineNumber}:${result.column}:${result.preview}`}>
                      <button
                        className="search-row"
                        type="button"
                        onClick={() => void openSearchResult(result).catch(console.error)}
                        title={`${result.lineNumber}:${result.column}`}
                      >
                        <span className="search-location">{result.lineNumber}:{result.column}</span>
                        <HighlightedPreview result={result} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}
