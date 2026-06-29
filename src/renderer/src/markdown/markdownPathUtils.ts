export function dirname(path: string): string {
  return path.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '');
}

export function isAbsoluteFilePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

export function pathToLocalResourceUrl(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `carlo-file://${withLeadingSlash.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
}

export function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `${path.startsWith('/') ? '/' : ''}${parts.join('/')}`;
}

export function localMarkdownAssetPath(markdownPath: string, url: string): string | undefined {
  if (/^(https?|file|mailto|data):/i.test(url) || url.startsWith('#')) return undefined;

  const suffixIndex = url.search(/[?#]/);
  const pathPart = suffixIndex >= 0 ? url.slice(0, suffixIndex) : url;
  if (!pathPart) return undefined;

  let decodedPath = pathPart;
  try {
    decodedPath = decodeURI(pathPart);
  } catch {
    // Keep the original path if the markdown contains a malformed escape.
  }
  return isAbsoluteFilePath(decodedPath)
    ? normalizePath(decodedPath)
    : normalizePath(`${dirname(markdownPath)}/${decodedPath}`);
}

export function resolveMarkdownUrl(markdownPath: string, url: string): string {
  const localPath = localMarkdownAssetPath(markdownPath, url);
  if (!localPath) return url;
  const suffixIndex = url.search(/[?#]/);
  const suffix = suffixIndex >= 0 ? url.slice(suffixIndex) : '';
  return `${pathToLocalResourceUrl(localPath)}${suffix}`;
}

export function markdownImageUrls(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]!).filter(Boolean))];
}
