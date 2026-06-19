import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FileTreeNode } from '@shared/file-types';
import { gitStatusForNode, type GitStatusContext } from './git-status';
import { ignoredNames } from './ignored-paths';

export async function listTree(
  rootPath: string,
  options: { recursive?: boolean; gitStatus?: GitStatusContext } = {},
): Promise<FileTreeNode[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const visibleEntries = entries
    .filter((entry) => !ignoredNames.has(entry.name))
    .sort((a, b) =>
      a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1,
    );

  return Promise.all(
    visibleEntries.map(async (entry) => {
      const path = join(rootPath, entry.name);
      const isDirectory = entry.isDirectory();
      return {
        name: entry.name,
        path,
        uri: pathToFileURL(path).toString(),
        type: isDirectory ? 'directory' : 'file',
        gitStatus: gitStatusForNode(path, isDirectory, options.gitStatus),
        children: isDirectory && options.recursive ? await listTree(path, options).catch(() => []) : undefined,
      } satisfies FileTreeNode;
    }),
  );
}
