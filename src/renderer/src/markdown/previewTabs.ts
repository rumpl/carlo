import type { EditorTab } from '../store/useEditorStore';

const previewScheme = 'markdown-preview:';

export function markdownPreviewUri(sourceUri: string): string {
  return `${previewScheme}${encodeURIComponent(sourceUri)}`;
}

export function isMarkdownPreviewUri(uri: string): boolean {
  return uri.startsWith(previewScheme);
}

export function sourceUriFromMarkdownPreviewUri(uri: string): string | undefined {
  if (!isMarkdownPreviewUri(uri)) return undefined;
  try {
    return decodeURIComponent(uri.slice(previewScheme.length));
  } catch {
    return undefined;
  }
}

export function isMarkdownTab(tab: EditorTab | undefined): tab is EditorTab {
  return Boolean(tab && (tab.languageId === 'markdown' || /\.(md|markdown|mdown|mkdn)$/i.test(tab.path)));
}
