import * as monaco from '@codingame/monaco-vscode-editor-api';
import { useEditorStore } from '../store/useEditorStore';
import { getEditor, getEditorGroupId, getEditorForGroup } from './MonacoEditor';

interface Location {
  uri: string;
  lineNumber: number;
  column: number;
  groupId?: string;
}

const history: Location[] = [];
let index = -1;
let navigating = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function sameLocation(a: Location | undefined, b: Location): boolean {
  return Boolean(a && a.uri === b.uri && a.lineNumber === b.lineNumber && a.column === b.column);
}

function sameLine(a: Location | undefined, b: Location): boolean {
  return Boolean(a && a.uri === b.uri && a.lineNumber === b.lineNumber);
}

function currentLocation(editor: monaco.editor.IStandaloneCodeEditor): Location | undefined {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position) return undefined;
  const groupId = getEditorGroupId(editor);
  return { uri: model.uri.toString(), lineNumber: position.lineNumber, column: position.column, groupId };
}

export function subscribeNavigationHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canNavigateBack(): boolean {
  return index > 0;
}

export function canNavigateForward(): boolean {
  return index >= 0 && index < history.length - 1;
}

export function recordNavigationLocation(
  editor: monaco.editor.IStandaloneCodeEditor,
  force = false,
): void {
  if (navigating) return;
  const location = currentLocation(editor);
  if (!location) return;

  const current = history[index];
  if (sameLocation(current, location)) return;
  if (!force && sameLine(current, location)) {
    history[index] = location;
    emit();
    return;
  }

  history.splice(index + 1);
  history.push(location);
  index = history.length - 1;
  emit();
}

function reveal(location: Location): void {
  const state = useEditorStore.getState();
  const tab = state.tabs.find((candidate) => candidate.uri === location.uri);
  if (!tab) return;

  navigating = true;
  state.setActive(tab.id, location.groupId);

  setTimeout(() => {
    const editor = location.groupId ? getEditorForGroup(location.groupId) ?? getEditor() : getEditor();
    if (!editor || editor.getModel()?.uri.toString() !== location.uri) {
      navigating = false;
      return;
    }
    const position = { lineNumber: location.lineNumber, column: location.column };
    editor.setPosition(position);
    editor.revealPositionInCenter(position, monaco.editor.ScrollType.Smooth);
    editor.focus();
    setTimeout(() => {
      navigating = false;
    }, 0);
  }, 0);
}

export function navigateBack(): void {
  if (!canNavigateBack()) return;
  index -= 1;
  emit();
  reveal(history[index]!);
}

export function navigateForward(): void {
  if (!canNavigateForward()) return;
  index += 1;
  emit();
  reveal(history[index]!);
}
