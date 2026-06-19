import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defaultUserConfig, mergeUserConfig, type CarloUserConfig } from '@shared/app-config';

function configHome(): string {
  return process.env.XDG_CONFIG_HOME || join(process.env.HOME ?? process.cwd(), '.config');
}

export function userConfigPath(): string {
  return join(configHome(), 'carlo', 'config.json');
}

function ensureUserConfig(path: string): void {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(defaultUserConfig(), null, 2)}\n`, 'utf8');
}

export function loadUserConfig(): CarloUserConfig {
  const path = userConfigPath();
  const defaults = defaultUserConfig();
  ensureUserConfig(path);

  try {
    const userConfig = JSON.parse(readFileSync(path, 'utf8')) as Partial<CarloUserConfig>;
    return mergeUserConfig(defaults, userConfig);
  } catch (error) {
    console.error(`Failed to load user config at ${path}`, error);
    return defaults;
  }
}

export function saveUserConfig(config: CarloUserConfig): CarloUserConfig {
  const path = userConfigPath();
  const merged = mergeUserConfig(defaultUserConfig(), config);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return merged;
}
