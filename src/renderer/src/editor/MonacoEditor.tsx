import { useEffect, useRef } from 'react';
import * as monaco from '@codingame/monaco-vscode-editor-api';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { activeTabInGroup, useEditorStore } from '../store/useEditorStore';
import { editorOptions, softWrapEnabled } from './editorOptions';
import { updateGitGutter } from './gitGutter';
import { getModel, isApplyingExternalContentUpdate } from './models';
import { recordNavigationLocation } from './navigationHistory';

const editors = new Map<string, monaco.editor.IStandaloneCodeEditor>();
let activeEditor: monaco.editor.IStandaloneCodeEditor | null = null;

export function getEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return activeEditor ?? editors.values().next().value ?? null;
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
  const hasActiveTab = Boolean(activeTabInGroup(groupId));

  useEffect(() => {
    if (!containerRef.current || editors.has(groupId)) return;
    const editor = monaco.editor.create(containerRef.current, { ...editorOptions, model: null });
    editors.set(groupId, editor);
    activeEditor = editor;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;
    const focusDisposable = editor.onDidFocusEditorWidget(() => {
      activeEditor = editor;
      setActiveGroup(groupId);
      recordNavigationLocation(editor);
    });
    const cursorDisposable = editor.onDidChangeCursorPosition(() => {
      if (navigationTimer) clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => recordNavigationLocation(editor), 350);
    });
    return () => {
      if (navigationTimer) clearTimeout(navigationTimer);
      focusDisposable.dispose();
      cursorDisposable.dispose();
      editor.dispose();
      editors.delete(groupId);
      if (activeEditor === editor) activeEditor = editors.values().next().value ?? null;
    };
  }, [groupId, setActiveGroup]);

  useEffect(() => {
    const editor = editors.get(groupId);
    if (!editor) return;
    const tab = activeTabInGroup(groupId);
    if (currentUri.current) viewStates.current.set(currentUri.current, editor.saveViewState());
    currentUri.current = tab?.uri ?? null;
    const model = tab ? (getModel(tab.uri) ?? null) : null;
    editor.setModel(model);
    if (tab) {
      editor.restoreViewState(viewStates.current.get(tab.uri) ?? null);
      void updateGitGutter(editor, tab);
    }
    editor.focus();
  }, [groupId, group?.activeTabId]);

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
  }, [groupId, group?.activeTabId, markDirty]);

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
