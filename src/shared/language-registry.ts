export const LANGUAGE_SERVERS = {
  typescript: { command: 'typescript-language-server', args: ['--stdio'] },
  javascript: { command: 'typescript-language-server', args: ['--stdio'] },
  json: { command: 'vscode-json-languageserver', args: ['--stdio'] },
  plaintext: null,
} as const;

export const EXT_TO_LANGUAGE = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
} as const;

export type LanguageId = keyof typeof LANGUAGE_SERVERS;
export type ServerLanguageId = Exclude<LanguageId, 'plaintext'>;

export function languageIdFromPath(filePath: string): LanguageId {
  const dot = filePath.lastIndexOf('.');
  const extension = (dot >= 0 ? filePath.slice(dot).toLowerCase() : '') as keyof typeof EXT_TO_LANGUAGE;
  return EXT_TO_LANGUAGE[extension] ?? 'plaintext';
}

export function hasLanguageServer(languageId: LanguageId): languageId is ServerLanguageId {
  return LANGUAGE_SERVERS[languageId] !== null;
}
