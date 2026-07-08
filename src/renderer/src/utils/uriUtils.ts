const fileUriPathReplacement: Record<string, string> = {
  '#': '%23',
  '?': '%3F',
  '~': '%7E',
};

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
 * Percent-encodes a filesystem path for use as the path component of a file URI.
 *
 * `encodeURI` is intentionally used instead of `encodeURIComponent` so path
 * separators and path-valid URI characters such as `:` remain compatible with
 * Node's `pathToFileURL`. URL delimiters that are valid in filenames must then
 * be encoded explicitly so they are not interpreted as query/fragment markers.
 */
function encodeFileUriPath(path: string): string {
  return encodeURI(path).replace(/[?#~]/g, (character) => fileUriPathReplacement[character]!);
}

/**
 * Converts an absolute filesystem path to a `file://` URI string.
 */
export function fileUriFromPath(path: string): string {
  const normalizedPath = path.replaceAll('\\', '/');

  if (normalizedPath.startsWith('//')) {
    const authorityAndPath = normalizedPath.slice(2);
    const pathStart = authorityAndPath.indexOf('/');
    const authority = pathStart >= 0 ? authorityAndPath.slice(0, pathStart) : authorityAndPath;
    const uriPath = pathStart >= 0 ? authorityAndPath.slice(pathStart) : '/';
    return `file://${authority}${encodeFileUriPath(uriPath)}`;
  }

  const uriPath = /^[A-Za-z]:\//.test(normalizedPath) ? `/${normalizedPath}` : normalizedPath;
  return `file://${encodeFileUriPath(uriPath.startsWith('/') ? uriPath : `/${uriPath}`)}`;
}
