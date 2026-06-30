import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function configHome(): string {
  return process.env.XDG_CONFIG_HOME || join(process.env.HOME ?? process.cwd(), '.config');
}

export function ensureConfigFile(path: string, defaultValue: unknown): void {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(defaultValue, null, 2)}\n`, 'utf8');
}

/**
 * Generic helper that ensures a JSON config file exists, reads it, merges it
 * with the provided defaults via `merge`, and returns the result.  Falls back
 * to `defaults` (and logs an error) if the file cannot be parsed.
 */
export function loadJsonConfig<T>(
  path: string,
  defaults: T,
  merge: (defaults: T, userValues: Partial<T>) => T,
): T {
  ensureConfigFile(path, defaults);
  try {
    const userValues = JSON.parse(readFileSync(path, 'utf8')) as Partial<T>;
    return merge(defaults, userValues);
  } catch (error) {
    console.error(`Failed to load config at ${path}`, error);
    return defaults;
  }
}
