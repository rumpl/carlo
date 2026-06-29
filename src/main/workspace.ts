import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function initialWorkspacePath(argv: string[] = process.argv, cwd: string = process.cwd()): string {
  // In Electron's main process, process.argv is always:
  //   [electronExePath, appEntryScript, ...userArgs]
  // This holds for both packaged and unpackaged (dev) builds — the entry
  // script (e.g. out/main/index.js) sits at index 1.  Slicing from index 2
  // unconditionally ensures neither the executable nor the app entry script
  // is ever treated as a workspace candidate.
  const sliceFrom = 2;

  const candidates = argv
    .slice(sliceFrom)
    .filter((arg) => !arg.startsWith('-'))
    .map((arg) => resolve(cwd, arg))
    .filter((path) => existsSync(path) && statSync(path).isDirectory());

  if (candidates.length > 0) return candidates.at(-1)!;
  return process.cwd();
}
