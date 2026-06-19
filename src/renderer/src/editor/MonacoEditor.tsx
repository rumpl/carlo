import { useEffect, useRef, useState } from 'react';
import * as monaco from '@codingame/monaco-vscode-editor-api';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { ensureVscodeServices } from '../vscode/servicesReady';
import { activeTabInGroup, useEditorStore } from '../store/useEditorStore';
import { editorOptions, softWrapEnabled } from './editorOptions';
import { updateGitGutter } from './gitGutter';
import { getModel, isApplyingExternalContentUpdate } from './models';
import { recordNavigationLocation } from './navigationHistory';

const editors = new Map<string, monaco.editor.IStandaloneCodeEditor>();
const pendingReveals = new Map<string, { uri: string; position: monaco.IPosition }>();
let activeEditor: monaco.editor.IStandaloneCodeEditor | null = null;

export function getEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return activeEditor ?? editors.values().next().value ?? null;
}

export function getEditorGroupId(editor: monaco.editor.ICodeEditor): string | undefined {
  for (const [groupId, candidate] of editors) {
    if (candidate === editor) return groupId;
  }
  return undefined;
}

export function setPendingReveal(groupId: string, uri: string, position: monaco.IPosition): void {
  pendingReveals.set(groupId, { uri, position });
}

export function revealPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  position: monaco.IPosition,
  scrollType = monaco.editor.ScrollType.Immediate,
): void {
  editor.setPosition(position);
  editor.revealPositionInCenter(position, scrollType);
}

export function setEditorsSoftWrap(enabled = softWrapEnabled()): void {
  for (const editor of editors.values()) {
    editor.updateOptions({ wordWrap: enabled ? 'on' : 'off' });
  }
}

export function setEditorsFontFamily(fontFamily: string): void {
  for (const editor of editors.values()) {
    editor.updateOptions({ fontFamily });
  }
}

export function refreshVisibleGitGuttersForPath(path: string): void {
  const tabs = useEditorStore.getState().tabs.filter((tab) => tab.path === path);
  for (const editor of editors.values()) {
    const model = editor.getModel();
    const tab = tabs.find((candidate) => candidate.uri === model?.uri.toString());
    if (tab) void updateGitGutter(editor, tab);
  }
}

export function refreshVisibleGitGutters(): void {
  const { tabs } = useEditorStore.getState();
  for (const editor of editors.values()) {
    const uri = editor.getModel()?.uri.toString();
    const tab = tabs.find((candidate) => candidate.uri === uri);
    if (tab) void updateGitGutter(editor, tab);
  }
}

interface Props {
  groupId: string;
}

export function MonacoEditor({ groupId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const group = useEditorStore((state) =>
    state.groups.find((candidate) => candidate.id === groupId),
  );
  const markDirty = useEditorStore((state) => state.markDirty);
  const setActiveGroup = useEditorStore((state) => state.setActiveGroup);
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>());
  const currentUri = useRef<string | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const hasActiveTab = Boolean(activeTabInGroup(groupId));

  useEffect(() => {
    if (!containerRef.current || editors.has(groupId)) return;
    let disposed = false;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;
    let focusDisposable: monaco.IDisposable | undefined;
    let cursorDisposable: monaco.IDisposable | undefined;
    let resizeObserver: ResizeObserver | undefined;

    void ensureVscodeServices()
      .then(() => {
        if (disposed || !containerRef.current || editors.has(groupId)) return;
        const container = containerRef.current;
        const editor = monaco.editor.create(container, { ...editorOptions, model: null });
        resizeObserver = new ResizeObserver(() => editor.layout());
        resizeObserver.observe(container);
        requestAnimationFrame(() => editor.layout());
        editors.set(groupId, editor);
        activeEditor = editor;
        focusDisposable = editor.onDidFocusEditorWidget(() => {
          activeEditor = editor;
          setActiveGroup(groupId);
          recordNavigationLocation(editor);
        });
        cursorDisposable = editor.onDidChangeCursorPosition(() => {
          if (navigationTimer) clearTimeout(navigationTimer);
          navigationTimer = setTimeout(() => recordNavigationLocation(editor), 350);
        });
        setEditorVersion((version) => version + 1);
      })
      .catch(console.error);

    return () => {
      disposed = true;
      if (navigationTimer) clearTimeout(navigationTimer);
      focusDisposable?.dispose();
      cursorDisposable?.dispose();
      resizeObserver?.disconnect();
      const editor = editors.get(groupId);
      editor?.dispose();
      editors.delete(groupId);
      if (activeEditor === editor) activeEditor = editors.values().next().value ?? null;
    };
  }, [groupId, setActiveGroup]);

  useEffect(() => {
    const editor = editors.get(groupId);
    if (!editor) return;
    const tab = activeTabInGroup(groupId);
    const actualModelUri = editor.getModel()?.uri.toString() ?? null;
    if (currentUri.current && actualModelUri === currentUri.current) {
      viewStates.current.set(currentUri.current, editor.saveViewState());
    }
    currentUri.current = tab?.uri ?? null;
    const model = tab ? (getModel(tab.uri) ?? null) : null;
    editor.setModel(model);
    requestAnimationFrame(() => editor.layout());
    if (tab) {
      editor.restoreViewState(viewStates.current.get(tab.uri) ?? null);
      const pendingReveal = pendingReveals.get(groupId);
      if (pendingReveal?.uri === tab.uri) {
        revealPosition(editor, pendingReveal.position);
        pendingReveals.delete(groupId);
      }
      void updateGitGutter(editor, tab);
    }
    editor.focus();
  }, [groupId, group?.activeTabId, editorVersion]);

  useEffect(() => {
    const editor = editors.get(groupId);
    const disposables: monaco.IDisposable[] = [];
    for (const tab of useEditorStore.getState().tabs) {
      const model = getModel(tab.uri);
      if (!model) continue;
      let gitTimer: ReturnType<typeof setTimeout> | undefined;
      disposables.push(
        model.onDidChangeContent(() => {
          if (!isApplyingExternalContentUpdate(model)) markDirty(tab.uri);
          if (gitTimer) clearTimeout(gitTimer);
          gitTimer = setTimeout(() => {
            if (editor?.getModel() === model) void updateGitGutter(editor, tab);
          }, 150);
        }),
      );
      disposables.push({ dispose: () => gitTimer && clearTimeout(gitTimer) });
    }
    return () => disposables.forEach((disposable) => disposable.dispose());
  }, [groupId, group?.activeTabId, editorVersion, markDirty]);

  return (
    <div className="editor-stack">
      <div
        className="editor-host"
        ref={containerRef}
        onMouseDownCapture={() => {
          activeEditor = editors.get(groupId) ?? activeEditor;
          setActiveGroup(groupId);
        }}
      />
      {!hasActiveTab ? <WelcomeScreen /> : null}
    </div>
  );
}
