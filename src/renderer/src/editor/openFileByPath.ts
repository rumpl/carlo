import { languageIdFromPath } from '@shared/language-registry';
import { titleFromPath } from '../commands/builtin/pathUtils';
import { useEditorStore } from '../store/useEditorStore';

function fileUriFromPath(path: string): string {
  return new URL(`file://${path}`).toString();
}

export async function openFileByPath(path: string, uri = fileUriFromPath(path)): Promise<void> {
  const languageId = languageIdFromPath(path);
  const { getModel, getOrCreateModel } = await import('./models');
  if (!getModel(uri)) {
    const file = await window.api.file.read(path);
    getOrCreateModel(uri, file.content, languageId);
  }
  useEditorStore.getState().openFile({ uri, path, languageId, title: titleFromPath(path) });
  const workspace = useEditorStore.getState().workspace;
  if (workspace) {
    const { ensureLanguageClient } = await import('../lsp/LanguageClientService');
    await ensureLanguageClient(languageId, workspace.rootUri, uri).catch(console.error);
  }
}
