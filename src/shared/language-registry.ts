export interface LanguageServerConfig {
  command: string;
  args: string[];
}

export interface LanguageConfig {
  languageServers: Record<string, LanguageServerConfig | null>;
  extensions: Record<string, string>;
}

export type LanguageId = string;
export type ServerLanguageId = string;

const defaultLanguageConfig: LanguageConfig = {
  languageServers: {
    typescript: { command: 'typescript-language-server', args: ['--stdio'] },
    typescriptreact: { command: 'typescript-language-server', args: ['--stdio'] },
    javascript: { command: 'typescript-language-server', args: ['--stdio'] },
    javascriptreact: { command: 'typescript-language-server', args: ['--stdio'] },
    json: { command: 'vscode-json-languageserver', args: ['--stdio'] },
    go: { command: 'gopls', args: [] },
    rust: { command: 'rust-analyzer', args: [] },
    plaintext: null,
  },
  extensions: {
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.json': 'json',
    '.go': 'go',
    '.rs': 'rust',
  },
};

let languageConfig: LanguageConfig = normalizeLanguageConfig(defaultLanguageConfig);

function normalizeLanguageConfig(config: Partial<LanguageConfig>): LanguageConfig {
  return {
    languageServers: Object.fromEntries(
      Object.entries(config.languageServers ?? {}).map(([languageId, server]) => [
        languageId,
        server ? { command: server.command, args: [...(server.args ?? [])] } : null,
      ]),
    ),
    extensions: Object.fromEntries(
      Object.entries(config.extensions ?? {}).map(([extension, languageId]) => [extension.toLowerCase(), languageId]),
    ),
  };
}

export function defaultConfig(): LanguageConfig {
  return normalizeLanguageConfig(defaultLanguageConfig);
}

export function getLanguageConfig(): LanguageConfig {
  return normalizeLanguageConfig(languageConfig);
}

export function setLanguageConfig(config: LanguageConfig): void {
  languageConfig = normalizeLanguageConfig(config);
}

export function mergeLanguageConfig(base: LanguageConfig, override: Partial<LanguageConfig>): LanguageConfig {
  return normalizeLanguageConfig({
    languageServers: { ...base.languageServers, ...(override.languageServers ?? {}) },
    extensions: { ...base.extensions, ...(override.extensions ?? {}) },
  });
}

export function languageServerFor(languageId: LanguageId): LanguageServerConfig | null | undefined {
  return languageConfig.languageServers[languageId];
}

export function languageIdFromPath(filePath: string): LanguageId {
  const dot = filePath.lastIndexOf('.');
  const extension = dot >= 0 ? filePath.slice(dot).toLowerCase() : '';
  const languageId = languageConfig.extensions[extension] ?? 'plaintext';

  // Older generated configs mapped JSX-bearing extensions to the plain TS/JS
  // language ids. Upgrade those legacy values at lookup time so Monaco and the
  // TypeScript LSP parse JSX syntax correctly.
  if (extension === '.tsx' && languageId === 'typescript') return 'typescriptreact';
  if (extension === '.jsx' && languageId === 'javascript') return 'javascriptreact';

  return languageId;
}

export function hasLanguageServer(languageId: LanguageId): languageId is ServerLanguageId {
  return languageServerFor(languageId) !== null && languageServerFor(languageId) !== undefined;
}
