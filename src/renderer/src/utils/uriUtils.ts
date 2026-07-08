export interface UriLike {
  scheme: string;
  fsPath: string;
  toString(): string;
}

/**
 * Returns a filesystem-friendly path string from a URI-like object.
 * For `file://` URIs this returns `uri.fsPath`; for all other schemes
 * the full URI string is returned.
 *
 * The structural type keeps this utility usable with Monaco URI objects
 * without statically importing Monaco into shell/store modules.
 */
export function pathFromUri(uri: UriLike): string {
  return uri.scheme === 'file' ? uri.fsPath : uri.toString();
}

/**
 * Converts an absolute filesystem path to a `file://` URI string.
 */
export function fileUriFromPath(path: string): string {
  return new URL(`file://${path}`).toString();
}
