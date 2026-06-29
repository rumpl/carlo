import { useEffect, useMemo, useRef, useState } from 'react';
import * as monaco from '@codingame/monaco-vscode-editor-api';
import { ensureVscodeServices } from '../vscode/servicesReady';
import { editorOptions } from './editorOptions';
import { getModel } from './models';
import { pathFromGitDiffUri } from '../git/diffTabs';
import { titleFromPath } from '../commands/builtin/pathUtils';
import { activeTabInGroup } from '../store/useEditorStore';

interface Props {
  groupId: string;
}

export function GitDiffEditor({ groupId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const tab = activeTabInGroup(groupId);
  const path = useMemo(() => (tab ? pathFromGitDiffUri(tab.uri) : undefined), [tab?.uri]);
  const [editorReady, setEditorReady] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || diffEditorRef.current) return;
    let disposed = false;
    void ensureVscodeServices()
      .then(() => {
        if (disposed || !containerRef.current || diffEditorRef.current) return;
        const editor = monaco.editor.createDiffEditor(containerRef.current, {
          ...editorOptions,
          readOnly: true,
          originalEditable: false,
          renderSideBySide: true,
        });
        diffEditorRef.current = editor;
        setEditorReady((version) => version + 1);
        resizeObserverRef.current = new ResizeObserver(() => editor.layout());
        resizeObserverRef.current.observe(containerRef.current);
        requestAnimationFrame(() => editor.layout());
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Failed to load diff editor'));
    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      const model = diffEditorRef.current?.getModel();
      model?.original.dispose();
      model?.modified.dispose();
      diffEditorRef.current?.dispose();
      diffEditorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor || !tab || !path) return;
    let cancelled = false;
    setError(null);
    void (async () => {
      const baseline = await window.api.git.baseline(path);
      const originalContent = baseline.isGitRepo ? (baseline.content ?? '') : '';
      const fileUri = new URL(`file://${path}`).toString();
      let modifiedContent = getModel(fileUri)?.getValue();
      if (modifiedContent === undefined) {
        modifiedContent = tab.uri.startsWith('git-diff:') ? undefined : getModel(tab.uri)?.getValue();
      }
      if (modifiedContent === undefined) {
        modifiedContent = await window.api.file.read(path).then((result) => result.content).catch(() => '');
      }
      if (cancelled) return;
      const previous = diffEditor.getModel();
      diffEditor.setModel(null);
      previous?.original.dispose();
      previous?.modified.dispose();
      const original = monaco.editor.createModel(
        originalContent,
        tab.languageId,
        monaco.Uri.parse(`git-original:${encodeURIComponent(path)}`),
      );
      const modified = monaco.editor.createModel(
        modifiedContent,
        tab.languageId,
        monaco.Uri.parse(`git-modified:${encodeURIComponent(path)}`),
      );
      diffEditor.setModel({ original, modified });
      requestAnimationFrame(() => diffEditor.layout());
    })().catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load changes');
    });
    return () => {
      cancelled = true;
    };
  }, [tab?.uri, path, editorReady]);

  return (
    <div className="editor-stack git-diff-stack">
      <div className="git-diff-title">
        {path ? `${titleFromPath(path)} changes` : 'Changes'}
        {error ? <span>{error}</span> : null}
      </div>
      <div className="editor-host git-diff-host" ref={containerRef} />
    </div>
  );
}
