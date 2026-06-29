import type { WorkspaceSearchMatch } from '@shared/file-types';
import { openFileByPath } from './openFileByPath';

export async function openSearchResult(result: WorkspaceSearchMatch): Promise<void> {
  const [{ getEditor, revealPosition, setPendingReveal }, { useEditorStore: editorStore }] = await Promise.all([
    import('./editorRegistry'),
    import('../store/useEditorStore'),
  ]);
  const position = { lineNumber: result.lineNumber, column: result.column };
  setPendingReveal(editorStore.getState().activeGroupId, result.uri, position);
  await openFileByPath(result.path, result.uri);
  requestAnimationFrame(() => {
    const editor = getEditor();
    if (editor?.getModel()?.uri.toString() === result.uri) revealPosition(editor, position);
  });
}
