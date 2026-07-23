const externalLinkProtocols = new Set(['http:', 'https:', 'mailto:']);
const externalImageProtocols = new Set(['http:', 'https:']);

function urlWithAllowedProtocol(value: string, protocols: ReadonlySet<string>): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return undefined;

  try {
    decodeURI(trimmed);
    const parsed = new URL(trimmed);
    return protocols.has(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function markdownAnchorUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.startsWith('#') && !/[\u0000-\u001f\u007f]/.test(trimmed)) return trimmed;
  return urlWithAllowedProtocol(trimmed, externalLinkProtocols);
}

export function renderedMarkdownAnchorUrl(value: string): string | undefined {
  const safeUrl = markdownAnchorUrl(value);
  if (safeUrl) return safeUrl;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'carlo-file:' && !parsed.username && !parsed.password
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function markdownExternalImageUrl(value: string): string | undefined {
  return urlWithAllowedProtocol(value, externalImageProtocols);
}

export function isSafeRenderedMarkdownImageUrl(value: string): boolean {
  if (markdownExternalImageUrl(value)) return true;
  if (/^data:image\/(?:apng|avif|gif|jpeg|png|svg\+xml|webp);base64,[a-z0-9+/]+=*$/i.test(value))
    return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'carlo-file:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function dirname(path: string): string {
  return path.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '');
}

export function isAbsoluteFilePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

export function pathToLocalResourceUrl(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `carlo-file://${withLeadingSlash
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
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
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('//') ||
    isAbsoluteFilePath(trimmed) ||
    /^[A-Za-z][A-Za-z\d+.-]*:/.test(trimmed) ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return undefined;
  }

  const suffixIndex = trimmed.search(/[?#]/);
  const pathPart = suffixIndex >= 0 ? trimmed.slice(0, suffixIndex) : trimmed;
  if (!pathPart) return undefined;

  let decodedPath: string;
  try {
    decodedPath = decodeURI(pathPart);
  } catch {
    return undefined;
  }
  if (isAbsoluteFilePath(decodedPath)) return undefined;
  return normalizePath(`${dirname(markdownPath)}/${decodedPath}`);
}

export function resolveMarkdownUrl(markdownPath: string, url: string): string | undefined {
  const localPath = localMarkdownAssetPath(markdownPath, url);
  if (!localPath) return undefined;
  const suffixIndex = url.search(/[?#]/);
  const suffix = suffixIndex >= 0 ? url.slice(suffixIndex) : '';
  return `${pathToLocalResourceUrl(localPath)}${suffix}`;
}

export function markdownImageUrls(markdown: string): string[] {
  return [
    ...new Set(
      [...markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
        .map((match) => match[1]!)
        .filter(Boolean),
    ),
  ];
}
