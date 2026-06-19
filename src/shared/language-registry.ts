import rawDefaultLanguageConfig from './language-config.json';

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

function unwrapJsonImport(value: unknown): Partial<LanguageConfig> {
  if (value && typeof value === 'object' && 'default' in value) {
    return (value as { default: Partial<LanguageConfig> }).default;
  }
  return value as Partial<LanguageConfig>;
}

const defaultLanguageConfig = unwrapJsonImport(rawDefaultLanguageConfig);
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
  return languageConfig.extensions[extension] ?? 'plaintext';
}

export function hasLanguageServer(languageId: LanguageId): languageId is ServerLanguageId {
  return languageServerFor(languageId) !== null && languageServerFor(languageId) !== undefined;
}
