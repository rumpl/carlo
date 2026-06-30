import { join } from 'node:path';
import { defaultConfig, mergeLanguageConfig, setLanguageConfig, type LanguageConfig } from '@shared/language-registry';
import { configHome, loadJsonConfig } from './config-home';

export function languageConfigPath(): string {
  return join(configHome(), 'carlo', 'languages.json');
}

export function loadLanguageConfig(): LanguageConfig {
  const config = loadJsonConfig(languageConfigPath(), defaultConfig(), mergeLanguageConfig);
  setLanguageConfig(config);
  return config;
}
