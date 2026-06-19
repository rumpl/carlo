import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function initialWorkspacePath(argv: string[] = process.argv, cwd: string = process.cwd()): string {
  const candidates = argv
    .slice(1)
    .filter((arg) => !arg.startsWith('-'))
    .map((arg) => resolve(cwd, arg))
    .filter((path) => existsSync(path) && statSync(path).isDirectory());

  if (candidates.length > 0) return candidates.at(-1)!;
  return process.cwd();
}
