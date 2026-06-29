import { useEffect, useMemo, useState } from 'react';
import { getModel } from '../editor/models';
import { renderMarkdown } from '../markdown/renderMarkdown';
import { sourceUriFromMarkdownPreviewUri } from '../markdown/previewTabs';
import { useEditorStore } from '../store/useEditorStore';

interface Props {
  groupId: string;
}

function dirname(path: string): string {
  return path.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '');
}

function isAbsoluteFilePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

function pathToLocalResourceUrl(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `carlo-file://${withLeadingSlash.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `${path.startsWith('/') ? '/' : ''}${parts.join('/')}`;
}

function localMarkdownAssetPath(markdownPath: string, url: string): string | undefined {
  if (/^(https?|file|mailto|data):/i.test(url) || url.startsWith('#')) return undefined;

  const suffixIndex = url.search(/[?#]/);
  const pathPart = suffixIndex >= 0 ? url.slice(0, suffixIndex) : url;
  if (!pathPart) return undefined;

  let decodedPath = pathPart;
  try {
    decodedPath = decodeURI(pathPart);
  } catch {
    // Keep the original path if the markdown contains a malformed escape.
  }
  return isAbsoluteFilePath(decodedPath)
    ? normalizePath(decodedPath)
    : normalizePath(`${dirname(markdownPath)}/${decodedPath}`);
}

function resolveMarkdownUrl(markdownPath: string, url: string): string {
  const localPath = localMarkdownAssetPath(markdownPath, url);
  if (!localPath) return url;
  const suffixIndex = url.search(/[?#]/);
  const suffix = suffixIndex >= 0 ? url.slice(suffixIndex) : '';
  return `${pathToLocalResourceUrl(localPath)}${suffix}`;
}

function markdownImageUrls(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]!).filter(Boolean))];
}

export function MarkdownPreview({ groupId }: Props) {
  const tab = useEditorStore((state) => {
    const activeTabId = state.groups.find((group) => group.id === groupId)?.activeTabId;
    return state.tabs.find((candidate) => candidate.id === activeTabId);
  });
  const sourceUri = tab ? sourceUriFromMarkdownPreviewUri(tab.uri) : undefined;
  const [content, setContent] = useState('');
  const [imageDataUrls, setImageDataUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!sourceUri || !tab) return;
    let cancelled = false;
    const model = getModel(sourceUri);
    if (model) {
      setContent(model.getValue());
      setError(undefined);
      const disposable = model.onDidChangeContent(() => setContent(model.getValue()));
      return () => disposable.dispose();
    }

    void window.api.file
      .read(tab.path)
      .then((file) => {
        if (cancelled) return;
        setContent(file.content);
        setError(undefined);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        console.error(reason);
        setError(reason instanceof Error ? reason.message : 'Could not load markdown preview.');
      });

    return () => {
      cancelled = true;
    };
  }, [sourceUri, tab?.uri, tab?.path]);

  useEffect(() => {
    if (!tab) return;
    let cancelled = false;
    const entries = markdownImageUrls(content)
      .map((url) => ({ url, path: localMarkdownAssetPath(tab.path, url) }))
      .filter((entry): entry is { url: string; path: string } => Boolean(entry.path));

    if (entries.length === 0) {
      setImageDataUrls({});
      return;
    }

    void Promise.all(
      entries.map(async ({ url, path }) => {
        try {
          const result = await window.api.file.readDataUrl(path);
          return [url, result.dataUrl] as const;
        } catch (reason) {
          console.error(`Could not load markdown image: ${path}`, reason);
          return undefined;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setImageDataUrls(Object.fromEntries(results.filter((entry): entry is readonly [string, string] => Boolean(entry))));
    });

    return () => {
      cancelled = true;
    };
  }, [content, tab?.path]);

  const html = useMemo(
    () =>
      renderMarkdown(content, {
        resolveUrl: (url) => resolveMarkdownUrl(tab?.path ?? '', url),
        resolveImageUrl: (url) => imageDataUrls[url] ?? resolveMarkdownUrl(tab?.path ?? '', url),
      }),
    [content, imageDataUrls, tab?.path],
  );

  if (!sourceUri || !tab) return <div className="markdown-preview empty">No markdown file selected.</div>;

  return (
    <div className="markdown-preview">
      <div className="markdown-preview-toolbar">
        <span>Preview</span>
        <span className="markdown-preview-path">{tab.path}</span>
      </div>
      {error ? (
        <div className="markdown-preview-error">{error}</div>
      ) : (
        <div
          className="markdown-preview-content"
          dangerouslySetInnerHTML={{ __html: html }}
          onClick={(event) => {
            const anchor = (event.target as Element).closest('a');
            if (!anchor) return;
            event.preventDefault();
          }}
        />
      )}
    </div>
  );
}
