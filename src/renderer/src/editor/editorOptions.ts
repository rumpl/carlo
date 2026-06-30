import * as monaco from '@codingame/monaco-vscode-editor-api';

const softWrapStorageKey = 'carlo.softWrap';

const defaultEditorFontSize = 14;
const defaultTabSize = 2;
const defaultEditorFontFamily =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

type WordWrap = NonNullable<monaco.editor.IStandaloneEditorConstructionOptions['wordWrap']>;

function wordWrapValue(enabled: boolean): WordWrap {
  return enabled ? 'on' : 'off';
}

export function softWrapEnabled(): boolean {
  try {
    const stored = globalThis.localStorage?.getItem(softWrapStorageKey);
    return stored === null || stored === undefined ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function setSoftWrapEnabled(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(softWrapStorageKey, String(enabled));
  } catch {
    // Ignore storage failures; keep the in-memory editor option updated.
  }
  editorOptions.wordWrap = wordWrapValue(enabled);
}


export const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontFamily: defaultEditorFontFamily,
  fontSize: defaultEditorFontSize,
  tabSize: defaultTabSize,
  insertSpaces: true,
  detectIndentation: false,
  wordWrap: wordWrapValue(softWrapEnabled()),
  minimap: { enabled: false },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: 'off',
  tabCompletion: 'off',
  wordBasedSuggestions: 'off',
  parameterHints: { enabled: false },
  cursorStyle: 'block',
};
