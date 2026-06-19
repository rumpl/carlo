import { languageIdFromPath } from '@shared/language-registry';
import { useEditorStore } from '../store/useEditorStore';

const diffPrefix = 'git-diff:';

export function gitDiffUri(path: string): string {
  return `${diffPrefix}${encodeURIComponent(path)}`;
}

export function isGitDiffUri(uri: string): boolean {
  return uri.startsWith(diffPrefix);
}

export function pathFromGitDiffUri(uri: string): string {
  return decodeURIComponent(uri.slice(diffPrefix.length));
}

function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function openGitChanges(path: string): void {
  const uri = gitDiffUri(path);
  useEditorStore.getState().openFile({
    uri,
    path,
    languageId: languageIdFromPath(path),
    title: `${titleFromPath(path)} (Changes)`,
  });
}
