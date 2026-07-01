import * as monaco from '@codingame/monaco-vscode-editor-api';
import { languageIdFromPath } from '@shared/language-registry';
import { ensureLanguageClient } from '../lsp/LanguageClientService';
import { useEditorStore } from '../store/useEditorStore';
import { getEditorGroupId, revealPosition, setPendingReveal } from './editorRegistry';
import { titleFromPath } from '../commands/builtin/pathUtils';
import { getOrCreateModel, getModel } from './models';
import { recordNavigationLocation } from './navigationHistory';
import { pathFromUri } from '../utils/uriUtils';

let disposable: monaco.IDisposable | undefined;

function positionFromSelectionOrPosition(selectionOrPosition?: monaco.IRange | monaco.IPosition): monaco.IPosition | undefined {
  if (!selectionOrPosition) return undefined;
  if ('lineNumber' in selectionOrPosition) return selectionOrPosition;
  return { lineNumber: selectionOrPosition.startLineNumber, column: selectionOrPosition.startColumn };
}

export function registerEditorOpener(): void {
  if (disposable) return;

  disposable = monaco.editor.registerEditorOpener({
    async openCodeEditor(source, resource, selectionOrPosition) {
      if (resource.scheme !== 'file') return false;

      const uri = resource.toString();
      const path = pathFromUri(resource);
      const languageId = languageIdFromPath(path);
      const workspace = useEditorStore.getState().workspace;

      recordNavigationLocation(source as monaco.editor.IStandaloneCodeEditor, true);

      let model = getModel(uri);
      if (!model) {
        const file = await window.api.file.read(path);
        model = getOrCreateModel(uri, file.content, languageId);
      }

      const editor = source as monaco.editor.IStandaloneCodeEditor;
      const groupId = getEditorGroupId(editor);
      if (groupId) useEditorStore.getState().setActiveGroup(groupId);

      const position = positionFromSelectionOrPosition(selectionOrPosition);
      if (groupId && position && editor.getModel()?.uri.toString() !== uri) {
        setPendingReveal(groupId, uri, position);
      }

      useEditorStore.getState().openFile({ uri, path, languageId, title: titleFromPath(path) });
      if (workspace) void ensureLanguageClient(languageId, workspace.rootUri, uri).catch(console.error);

      editor.setModel(model);
      if (position && editor.getModel()?.uri.toString() === uri) {
        revealPosition(editor, position, monaco.editor.ScrollType.Smooth);
      }
      editor.focus();
      recordNavigationLocation(editor, true);

      return true;
    },
  });
}
