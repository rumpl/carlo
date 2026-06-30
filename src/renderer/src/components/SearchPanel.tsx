import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import type { WorkspaceSearchMatch } from '@shared/file-types';
import { useEditorStore } from '../store/useEditorStore';
import { useSearchStore } from '../store/useSearchStore';
import { openSearchResult } from '../search/openSearchResult';
import { SearchFileSection } from './SearchFileSection';

export function SearchPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchSeq = useRef(0);
  const debounceHandle = useRef<number | undefined>(undefined);

  const workspace = useEditorStore((state) => state.workspace);

  // Single subscription for all display state – shallow equality prevents spurious re-renders
  const { query, results, loading, truncated, error, hasSearched } = useSearchStore(
    useShallow((state) => ({
      query: state.query,
      results: state.results,
      loading: state.loading,
      truncated: state.truncated,
      error: state.error,
      hasSearched: state.hasSearched,
    })),
  );

  // Actions are stable store references; grab them once via getState so they
  // don't need their own subscriptions.
  const { closeSearch, setQuery, setLoading, setResults, setError } = useSearchStore.getState();

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

  const runSearch = useCallback(async (searchQuery: string, seq: number): Promise<void> => {
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
  }, [workspace, setLoading, setError, setResults]);

  useEffect(() => {
    const seq = ++searchSeq.current;
    if (!query.trim()) {
      setLoading(false);
      setError(null);
      setResults([], false);
      return;
    }
    debounceHandle.current = window.setTimeout(() => void runSearch(query, seq), 250);
    return () => window.clearTimeout(debounceHandle.current);
  }, [query, workspace?.rootPath, runSearch, setLoading, setError, setResults]);

  return (
    <section className="search-panel" aria-label="Search">
      <header className="search-header">
        <div className="search-title">Search</div>
        <form className="search-form" onSubmit={(event) => {
          event.preventDefault();
          window.clearTimeout(debounceHandle.current);
          void runSearch(query, ++searchSeq.current);
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
              <SearchFileSection
                key={path}
                path={path}
                results={fileResults}
                rootPath={workspace.rootPath}
                onOpen={(result) => void openSearchResult(result).catch(console.error)}
              />
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}
