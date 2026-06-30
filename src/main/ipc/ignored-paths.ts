export const ignoredNames = new Set(['.git', 'node_modules', 'out', 'dist', 'build', '.DS_Store']);
export const ignoredWatchNames = new Set(['node_modules', 'out', 'dist', 'build', '.DS_Store']);

export function isIgnoredPath(path: string, names: Set<string>): boolean {
  return path.split(/[\\/]/).some((part) => names.has(part));
}
