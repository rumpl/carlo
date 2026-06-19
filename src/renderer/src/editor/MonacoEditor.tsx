import { useEffect, useRef } from 'react';
import * as monaco from '@codingame/monaco-vscode-editor-api';
import { activeTab, useEditorStore } from '../store/useEditorStore';
import { editorOptions } from './editorOptions';
import { getModel } from './models';

let currentEditor: monaco.editor.IStandaloneCodeEditor | null = null;
export function getEditor(): monaco.editor.IStandaloneCodeEditor | null { return currentEditor; }

export function MonacoEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const markDirty = useEditorStore((state) => state.markDirty);
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>());
  const currentUri = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || currentEditor) return;
    currentEditor = monaco.editor.create(containerRef.current, { ...editorOptions, model: null });
    return () => { currentEditor?.dispose(); currentEditor = null; };
  }, []);

  useEffect(() => {
    if (!currentEditor) return;
    const tab = activeTab();
    if (currentUri.current) viewStates.current.set(currentUri.current, currentEditor.saveViewState());
    currentUri.current = tab?.uri ?? null;
    const model = tab ? getModel(tab.uri) ?? null : null;
    currentEditor.setModel(model);
    if (tab) currentEditor.restoreViewState(viewStates.current.get(tab.uri) ?? null);
    currentEditor.focus();
  }, [activeTabId]);

  useEffect(() => {
    const disposables: monaco.IDisposable[] = [];
    for (const tab of useEditorStore.getState().tabs) {
      const model = getModel(tab.uri);
      if (!model) continue;
      disposables.push(model.onDidChangeContent(() => markDirty(tab.uri)));
    }
    return () => disposables.forEach((disposable) => disposable.dispose());
  }, [activeTabId, markDirty]);

  return <div className="editor-host" ref={containerRef} />;
}
