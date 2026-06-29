import { app } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function initialWorkspacePath(argv: string[] = process.argv, cwd: string = process.cwd()): string {
  // In Electron's main process, process.argv is:
  //   packaged:   [electronExePath, appPath, ...userArgs]
  //   unpackaged: [electronExePath, ...userArgs]
  // Slicing from index 2 when packaged (or 1 when unpackaged) ensures the app
  // bundle / packed JS entry is not treated as a workspace candidate.
  const sliceFrom = app.isPackaged ? 2 : 1;

  const candidates = argv
    .slice(sliceFrom)
    .filter((arg) => !arg.startsWith('-'))
    .map((arg) => resolve(cwd, arg))
    .filter((path) => existsSync(path) && statSync(path).isDirectory());

  if (candidates.length > 0) return candidates.at(-1)!;
  return process.cwd();
}
