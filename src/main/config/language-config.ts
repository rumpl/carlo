import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultConfig, mergeLanguageConfig, setLanguageConfig, type LanguageConfig } from '@shared/language-registry';
import { configHome, ensureConfigFile } from './config-home';

export function languageConfigPath(): string {
  return join(configHome(), 'carlo', 'languages.json');
}

export function loadLanguageConfig(): LanguageConfig {
  const path = languageConfigPath();
  const defaults = defaultConfig();
  ensureConfigFile(path, defaults);

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
