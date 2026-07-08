import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GitChangedFile, GitFileStatus, GitStatusResult } from '@shared/file-types';
import { gitExec, gitExecRaw } from './git-exec';

export interface GitStatusContext {
  rootPath: string;
  statuses: Map<string, GitFileStatus>;
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
  let descendantStatus: GitFileStatus | undefined;

  for (const [changedPath, changedStatus] of gitStatus.statuses) {
    if (changedStatus === 'ignored' || !normalizeGitStatusPath(changedPath).startsWith(directoryPrefix)) {
      continue;
    }

    if (!descendantStatus || gitStatusOrder[changedStatus] < gitStatusOrder[descendantStatus]) {
      descendantStatus = changedStatus;
      if (descendantStatus === 'conflict') break;
    }
  }

  return descendantStatus;
}

export async function getGitStatusContext(path: string): Promise<GitStatusContext | undefined> {
  try {
    const gitRootPath = await gitExec(['rev-parse', '--show-toplevel'], path);
    const status = await gitExecRaw(
      ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching'],
      gitRootPath,
    );
    return { rootPath: gitRootPath, statuses: parseGitStatus(status, gitRootPath) };
  } catch {
    return undefined;
  }
}

const gitStatusOrder: Record<GitFileStatus, number> = {
  conflict: 0,
  modified: 1,
  added: 2,
  deleted: 3,
  renamed: 4,
  untracked: 5,
  ignored: 6,
};

export async function getGitStatus(path: string): Promise<GitStatusResult> {
  const context = await getGitStatusContext(path);
  if (!context) return { isGitRepo: false, files: [] };
  const files: GitChangedFile[] = [...context.statuses.entries()]
    .filter(([, status]) => status !== 'ignored')
    .map(([changedPath, status]) => ({
      path: changedPath,
      uri: pathToFileURL(changedPath).toString(),
      relativePath: relative(context.rootPath, changedPath),
      status,
    }))
    .sort((a, b) => gitStatusOrder[a.status] - gitStatusOrder[b.status] || a.relativePath.localeCompare(b.relativePath));
  return { isGitRepo: true, rootPath: context.rootPath, files };
}
