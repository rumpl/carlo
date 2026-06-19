import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { GitFileStatus } from '@shared/file-types';

const execFileAsync = promisify(execFile);

export interface GitStatusContext {
  rootPath: string;
  statuses: Map<string, GitFileStatus>;
}

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

function statusFromPorcelain(indexStatus: string, workTreeStatus: string): GitFileStatus | undefined {
  if (indexStatus === '!' || workTreeStatus === '!') return 'ignored';
  if (indexStatus === '?' || workTreeStatus === '?') return 'untracked';
  if (
    indexStatus === 'U' ||
    workTreeStatus === 'U' ||
    ['DD', 'AU', 'UD', 'UA', 'DU', 'AA'].includes(`${indexStatus}${workTreeStatus}`)
  ) {
    return 'conflict';
  }
  if (indexStatus === 'D' || workTreeStatus === 'D') return 'deleted';
  if (indexStatus === 'R' || workTreeStatus === 'R') return 'renamed';
  if (indexStatus === 'A' || workTreeStatus === 'A' || indexStatus === 'C' || workTreeStatus === 'C') {
    return 'added';
  }
  if (indexStatus === 'M' || workTreeStatus === 'M' || indexStatus === 'T' || workTreeStatus === 'T') {
    return 'modified';
  }
  return undefined;
}

function parseGitStatus(output: string, gitRootPath: string): Map<string, GitFileStatus> {
  const statuses = new Map<string, GitFileStatus>();
  const entries = output.split('\0').filter(Boolean);

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (entry.length < 4) continue;

    const status = statusFromPorcelain(entry[0]!, entry[1]!);
    if (!status) continue;

    const relativePath = entry.slice(3);
    statuses.set(join(gitRootPath, relativePath), status);

    if (entry[0] === 'R' || entry[0] === 'C') index += 1;
  }

  return statuses;
}

function normalizeGitStatusPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '');
}

export function gitStatusForNode(
  path: string,
  isDirectory: boolean,
  gitStatus: GitStatusContext | undefined,
): GitFileStatus | undefined {
  const directStatus = gitStatus?.statuses.get(path);
  if (directStatus || !isDirectory || !gitStatus) return directStatus;

  const directoryPrefix = `${normalizeGitStatusPath(path)}/`;
  for (const [changedPath, changedStatus] of gitStatus.statuses) {
    if (changedStatus === 'modified' && normalizeGitStatusPath(changedPath).startsWith(directoryPrefix)) {
      return 'modified';
    }
  }

  return undefined;
}

export async function getGitStatusContext(path: string): Promise<GitStatusContext | undefined> {
  try {
    const gitRootPath = (await git(['rev-parse', '--show-toplevel'], path)).trimEnd();
    const status = await git(
      ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching'],
      gitRootPath,
    );
    return { rootPath: gitRootPath, statuses: parseGitStatus(status, gitRootPath) };
  } catch {
    return undefined;
  }
}
