import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { basename, extname, join, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FileOperationResult } from '@shared/file-types';

export function assertSafeChildName(name: string): void {
  if (!name || name === '.' || name === '..' || name !== basename(name)) {
    throw new Error('Invalid name');
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function uniqueCopyDestination(
  sourcePath: string,
  destinationDirectory: string,
): Promise<string> {
  const sourceStats = await stat(sourcePath);
  const sourceName = basename(sourcePath);
  const extension = sourceStats.isDirectory() ? '' : extname(sourceName);
  const baseName = extension ? sourceName.slice(0, -extension.length) : sourceName;

  let candidate = join(destinationDirectory, sourceName);
  if (!(await pathExists(candidate))) return candidate;

  candidate = join(destinationDirectory, `${baseName} copy${extension}`);
  if (!(await pathExists(candidate))) return candidate;

  for (let index = 2; ; index += 1) {
    candidate = join(destinationDirectory, `${baseName} copy ${index}${extension}`);
    if (!(await pathExists(candidate))) return candidate;
  }
}

export function isPathInsideOrEqual(childPath: string, parentPath: string): boolean {
  const normalizedChild = normalize(childPath);
  const normalizedParent = normalize(parentPath);
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}${sep}`);
}

export function operationResult(path: string): FileOperationResult {
  return { path, uri: pathToFileURL(path).toString() };
}
