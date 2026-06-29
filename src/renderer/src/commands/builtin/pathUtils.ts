export function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/**
 * Returns `path` relative to `rootPath`, normalising backslashes so that the
 * result is always forward-slash separated. When `rootPath` is undefined (no
 * workspace open) or `path` is not under `rootPath`, the original `path` is
 * returned unchanged.
 */
export function relativePath(path: string, rootPath: string | undefined): string {
  if (!rootPath) return path;
  const normalizedRoot = rootPath.replaceAll('\\', '/').replace(/\/+$/, '');
  const normalizedPath = path.replaceAll('\\', '/');
  return normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : path;
}

export function rootFor(path: string): { rootPath: string; rootUri: string; name: string } {
  const rootPath = path.split(/[\\/]/).slice(0, -1).join('/') || '/';
  return {
    rootPath,
    rootUri: new URL(`file://${rootPath}`).toString(),
    name: rootPath.split(/[\\/]/).pop() ?? rootPath,
  };
}
