import type { WorkspaceSearchMatch } from '@shared/file-types';
import { openSearchResult } from '../search/openSearchResult';
import { relativePath } from '../commands/builtin/pathUtils';
import { HighlightedPreview } from './HighlightedPreview';

interface SearchFileGroupProps {
  path: string;
  results: WorkspaceSearchMatch[];
  rootPath: string;
}

export function SearchFileGroup({ path, results, rootPath }: SearchFileGroupProps) {
  return (
    <section className="search-file">
      <div className="search-file-title" title={path}>
        {relativePath(path, rootPath)}
        <span>{results.length}</span>
      </div>
      <ul>
        {results.map((result) => (
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
  );
}
