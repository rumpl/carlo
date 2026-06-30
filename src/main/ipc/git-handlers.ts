import { ipcMain } from 'electron';
import { dirname, relative } from 'node:path';
import { IPC } from '@shared/ipc';
import type { GitBaselineResult, GitStatusResult } from '@shared/file-types';
import { gitExec, gitExecRaw } from './git-exec';
import { getGitStatus } from './git-status';

export function registerGitHandlers(): void {
  ipcMain.handle(IPC.gitStatus, async (_event, { rootPath }: { rootPath: string }): Promise<GitStatusResult> =>
    getGitStatus(rootPath),
  );

  ipcMain.handle(IPC.gitBaseline, async (_event, { path }: { path: string }): Promise<GitBaselineResult> => {
    try {
      const cwd = dirname(path);
      const rootPath = await gitExec(['rev-parse', '--show-toplevel'], cwd);
      const relativePath = relative(rootPath, path);

      try {
        await gitExec(['ls-files', '--error-unmatch', '--', relativePath], rootPath);
      } catch {
        return { isGitRepo: true, tracked: false, rootPath, content: '' };
      }

      try {
        const content = await gitExecRaw(['show', `HEAD:${relativePath}`], rootPath);
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
