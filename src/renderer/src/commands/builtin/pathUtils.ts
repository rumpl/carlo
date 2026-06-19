export function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function rootFor(path: string): { rootPath: string; rootUri: string; name: string } {
  const rootPath = path.split(/[\\/]/).slice(0, -1).join('/') || '/';
  return {
    rootPath,
    rootUri: new URL(`file://${rootPath}`).toString(),
    name: rootPath.split(/[\\/]/).pop() ?? rootPath,
  };
}
