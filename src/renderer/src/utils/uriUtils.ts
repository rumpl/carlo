import * as monaco from '@codingame/monaco-vscode-editor-api';

/**
 * Returns a filesystem-friendly path string from a Monaco URI.
 * For `file://` URIs this returns `uri.fsPath`; for all other schemes
 * the full URI string is returned.
 */
export function pathFromUri(uri: monaco.Uri): string {
  return uri.scheme === 'file' ? uri.fsPath : uri.toString();
}

/**
 * Converts an absolute filesystem path to a `file://` URI string.
 */
export function fileUriFromPath(path: string): string {
  return new URL(`file://${path}`).toString();
}
