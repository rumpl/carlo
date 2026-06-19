import { ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import { dirname, relative } from 'node:path';
import { promisify } from 'node:util';
import { IPC } from '@shared/ipc';
import type { GitBaselineResult, GitStatusResult } from '@shared/file-types';
import { getGitStatus } from './git-status';

const execFileAsync = promisify(execFile);

async function git(args: string[], cwd: string): Promise<string> {
  return (await gitRaw(args, cwd)).trimEnd();
}

async function gitRaw(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

export function registerGitHandlers(): void {
  ipcMain.handle(IPC.gitStatus, async (_event, { rootPath }: { rootPath: string }): Promise<GitStatusResult> =>
    getGitStatus(rootPath),
  );

  ipcMain.handle(IPC.gitBaseline, async (_event, { path }: { path: string }): Promise<GitBaselineResult> => {
    try {
      const cwd = dirname(path);
      const rootPath = await git(['rev-parse', '--show-toplevel'], cwd);
      const relativePath = relative(rootPath, path);

      try {
        await git(['ls-files', '--error-unmatch', '--', relativePath], rootPath);
      } catch {
        return { isGitRepo: true, tracked: false, rootPath, content: '' };
      }

      try {
        const content = await gitRaw(['show', `HEAD:${relativePath}`], rootPath);
        return { isGitRepo: true, tracked: true, rootPath, content };
      } catch (error) {
        return {
          isGitRepo: true,
          tracked: true,
          rootPath,
          content: '',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } catch {
      return { isGitRepo: false, tracked: false };
    }
  });
}
