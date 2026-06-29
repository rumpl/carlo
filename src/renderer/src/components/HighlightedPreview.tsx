import type { WorkspaceSearchMatch } from '@shared/file-types';

export function HighlightedPreview({ result }: { result: WorkspaceSearchMatch }) {
  return (
    <span className="search-preview">
      {result.preview.slice(0, result.matchStart)}
      <mark>{result.preview.slice(result.matchStart, result.matchEnd)}</mark>
      {result.preview.slice(result.matchEnd)}
    </span>
  );
}
