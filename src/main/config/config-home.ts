import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function configHome(): string {
  return process.env.XDG_CONFIG_HOME || join(process.env.HOME ?? process.cwd(), '.config');
}

export function ensureConfigFile(path: string, defaultValue: unknown): void {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(defaultValue, null, 2)}
`, 'utf8');
}
