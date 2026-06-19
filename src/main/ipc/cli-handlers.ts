import { ipcMain } from 'electron';
import { access, chmod, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { IPC } from '@shared/ipc';

export type InstallCommandLineResult =
  | { ok: true; path: string; warning?: string }
  | { ok: false; error: string; instructions?: string };

const commandName = 'carlo';

async function canWriteDirectory(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function pathContainsDirectory(directory: string): boolean {
  return (process.env.PATH ?? '').split(':').includes(directory);
}

async function installDirectory(): Promise<{ path: string; warning?: string } | undefined> {
  const userBin = join(homedir(), '.local', 'bin');
  const candidates =
    process.platform === 'darwin'
      ? ['/usr/local/bin', '/opt/homebrew/bin', userBin]
      : ['/usr/local/bin', userBin];

  for (const candidate of candidates) {
    if (candidate === userBin) await mkdir(candidate, { recursive: true });
    if (!(await canWriteDirectory(candidate))) continue;
    const warning = pathContainsDirectory(candidate)
      ? undefined
      : `${candidate} does not appear to be in PATH. Add it to your shell PATH if 'carlo' is not found.`;
    return { path: candidate, warning };
  }

  return undefined;
}

function macAppPath(): string | undefined {
  const marker = '.app/Contents/MacOS/';
  const index = process.execPath.indexOf(marker);
  if (index === -1) return undefined;
  return process.execPath.slice(0, index + '.app'.length);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function scriptContents(): string | undefined {
  if (process.platform === 'darwin') {
    const appPath = macAppPath();
    if (!appPath) return undefined;
    return `#!/bin/sh
set -e
if [ "$#" -eq 0 ]; then
  set -- "$PWD"
fi
open -n ${shellQuote(appPath)} --args "$@"
`;
  }

  return `#!/bin/sh
set -e
if [ "$#" -eq 0 ]; then
  set -- "$PWD"
fi
${shellQuote(process.execPath)} "$@" >/dev/null 2>&1 &
`;
}

export function registerCliHandlers(): void {
  ipcMain.handle(IPC.appInstallCommandLine, async (): Promise<InstallCommandLineResult> => {
    const script = scriptContents();
    if (!script) {
      return {
        ok: false,
        error: 'Could not locate the packaged Carlo app bundle.',
        instructions: 'Move Carlo to /Applications, open it again, then retry this command.',
      };
    }

    const directory = await installDirectory();
    if (!directory) {
      return {
        ok: false,
        error: 'Could not find a writable directory for the carlo command.',
        instructions:
          'Make /usr/local/bin writable for your user, or create ~/.local/bin and add it to PATH, then retry.',
      };
    }

    const destination = join(directory.path, commandName);
    try {
      await writeFile(destination, script, { mode: 0o755 });
      await chmod(destination, 0o755);
      return { ok: true, path: destination, warning: directory.warning };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        instructions: `Could not write ${destination}. Check the directory permissions and retry.`,
      };
    }
  });
}
