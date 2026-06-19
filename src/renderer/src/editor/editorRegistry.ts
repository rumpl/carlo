import * as monaco from '@codingame/monaco-vscode-editor-api';
import { useEditorStore } from '../store/useEditorStore';
import { softWrapEnabled } from './editorOptions';
import { updateGitGutter } from './gitGutter';

const editors = new Map<string, monaco.editor.IStandaloneCodeEditor>();
const pendingReveals = new Map<string, { uri: string; position: monaco.IPosition }>();
let activeEditor: monaco.editor.IStandaloneCodeEditor | null = null;

export function getEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return activeEditor ?? editors.values().next().value ?? null;
}

export function getEditorForGroup(groupId: string): monaco.editor.IStandaloneCodeEditor | undefined {
  return editors.get(groupId);
}

export function hasEditorForGroup(groupId: string): boolean {
  return editors.has(groupId);
}

export function registerEditor(groupId: string, editor: monaco.editor.IStandaloneCodeEditor): void {
  editors.set(groupId, editor);
  activeEditor = editor;
}

export function unregisterEditor(groupId: string): void {
  const editor = editors.get(groupId);
  editor?.dispose();
  editors.delete(groupId);
  if (activeEditor === editor) activeEditor = editors.values().next().value ?? null;
}

export function setActiveEditor(editor: monaco.editor.IStandaloneCodeEditor | null): void {
  activeEditor = editor;
}

export function setActiveEditorForGroup(groupId: string): void {
  activeEditor = editors.get(groupId) ?? activeEditor;
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

export function getPendingReveal(groupId: string): { uri: string; position: monaco.IPosition } | undefined {
  return pendingReveals.get(groupId);
}

export function clearPendingReveal(groupId: string): void {
  pendingReveals.delete(groupId);
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

export function setEditorsFontSize(fontSize: number): void {
  for (const editor of editors.values()) {
    editor.updateOptions({ fontSize });
  }
}

export function setEditorsTabSize(tabSize: number): void {
  for (const editor of editors.values()) {
    editor.updateOptions({ tabSize, insertSpaces: true, detectIndentation: false });
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
