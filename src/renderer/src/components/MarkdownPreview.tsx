import { useEffect, useMemo, useState } from 'react';
import { getModel } from '../editor/models';
import { renderMarkdown } from '../markdown/renderMarkdown';
import { sourceUriFromMarkdownPreviewUri } from '../markdown/previewTabs';
import { useEditorStore } from '../store/useEditorStore';

interface Props {
  groupId: string;
}

export function MarkdownPreview({ groupId }: Props) {
  const tab = useEditorStore((state) => {
    const activeTabId = state.groups.find((group) => group.id === groupId)?.activeTabId;
    return state.tabs.find((candidate) => candidate.id === activeTabId);
  });
  const sourceUri = tab ? sourceUriFromMarkdownPreviewUri(tab.uri) : undefined;
  const [content, setContent] = useState('');
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
  }, [sourceUri, tab]);

  const html = useMemo(() => renderMarkdown(content), [content]);

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
