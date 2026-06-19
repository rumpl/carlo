import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defaultConfig, mergeLanguageConfig, setLanguageConfig, type LanguageConfig } from '@shared/language-registry';

function configHome(): string {
  return process.env.XDG_CONFIG_HOME || join(process.env.HOME ?? process.cwd(), '.config');
}

export function languageConfigPath(): string {
  return join(configHome(), 'carlo', 'languages.json');
}

function ensureUserConfig(path: string): void {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(defaultConfig(), null, 2)}\n`, 'utf8');
}

export function loadLanguageConfig(): LanguageConfig {
  const path = languageConfigPath();
  const defaults = defaultConfig();
  ensureUserConfig(path);

  try {
    const userConfig = JSON.parse(readFileSync(path, 'utf8')) as Partial<LanguageConfig>;
    const config = mergeLanguageConfig(defaults, userConfig);
    setLanguageConfig(config);
    return config;
  } catch (error) {
    console.error(`Failed to load language config at ${path}`, error);
    setLanguageConfig(defaults);
    return defaults;
  }
}
