import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultUserConfig, mergeUserConfig, type CarloUserConfig } from '@shared/app-config';
import { configHome, loadJsonConfig } from './config-home';

export function userConfigPath(): string {
  return join(configHome(), 'carlo', 'config.json');
}

export function loadUserConfig(): CarloUserConfig {
  return loadJsonConfig(userConfigPath(), defaultUserConfig(), mergeUserConfig);
}

export function saveUserConfig(config: CarloUserConfig): CarloUserConfig {
  const path = userConfigPath();
  const merged = mergeUserConfig(defaultUserConfig(), config);
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return merged;
}
