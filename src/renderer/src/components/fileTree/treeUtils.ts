import type { FileTreeNode } from '@shared/file-types';

export function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function replaceNodeChildren(
  nodes: FileTreeNode[],
  targetPath: string,
  children: FileTreeNode[],
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) return { ...node, children };
    if (node.type !== 'directory' || !node.children) return node;
    return { ...node, children: replaceNodeChildren(node.children, targetPath, children) };
  });
}

export function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '');
}

export function parentDirectory(path: string): string {
  return path.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '');
}

export function hasValidChildName(name: string): boolean {
  return Boolean(name) && name !== '.' && name !== '..' && !/[\\/]/.test(name);
}

export function ancestorDirectories(rootPath: string, targetPath: string): string[] {
  const normalizedRoot = normalizePath(rootPath);
  const normalizedTarget = normalizePath(targetPath);
  if (
    normalizedTarget === normalizedRoot ||
    !normalizedTarget.startsWith(`${normalizedRoot}/`)
  ) {
    return [];
  }

  const separator = rootPath.includes('\\') ? '\\' : '/';
  const root = rootPath.replace(/[\\/]+$/, '');
  const relativeParts = normalizedTarget.slice(normalizedRoot.length + 1).split('/');
  const directoryParts = relativeParts.slice(0, -1);
  const ancestors: string[] = [];
  let current = root;
  for (const part of directoryParts) {
    current = `${current}${separator}${part}`;
    ancestors.push(current);
  }
  return ancestors;
}

export function findNode(nodes: FileTreeNode[], targetPath: string): FileTreeNode | undefined {
  const normalizedTarget = normalizePath(targetPath);
  for (const node of nodes) {
    if (normalizePath(node.path) === normalizedTarget) return node;
    if (node.type !== 'directory' || !node.children) continue;
    const found = findNode(node.children, targetPath);
    if (found) return found;
  }
  return undefined;
}
