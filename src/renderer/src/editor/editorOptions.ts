import * as monaco from '@codingame/monaco-vscode-editor-api';

const softWrapStorageKey = 'carlo.softWrap';

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

export function toggleSoftWrapEnabled(): boolean {
  const enabled = !softWrapEnabled();
  setSoftWrapEnabled(enabled);
  return enabled;
}

export const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
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
