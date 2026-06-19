import * as monaco from '@codingame/monaco-vscode-editor-api';
import type { LanguageId } from '@shared/language-registry';

const models = new Map<string, monaco.editor.ITextModel>();

export function getOrCreateModel(
  uri: string,
  content: string,
  languageId: LanguageId,
): monaco.editor.ITextModel {
  const existing = models.get(uri);
  if (existing) return existing;
  const model = monaco.editor.createModel(content, languageId, monaco.Uri.parse(uri));
  models.set(uri, model);
  return model;
}

export function getModel(uri: string): monaco.editor.ITextModel | undefined {
  return models.get(uri);
}

export function replaceModelUri(
  oldUri: string,
  newUri: string,
  content: string,
  languageId: LanguageId,
): monaco.editor.ITextModel {
  disposeModel(oldUri);
  return getOrCreateModel(newUri, content, languageId);
}

export function disposeModel(uri: string): void {
  const model = models.get(uri);
  if (!model) return;
  model.dispose();
  models.delete(uri);
}
