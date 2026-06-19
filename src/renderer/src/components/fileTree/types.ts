import type { FileTreeNode } from '@shared/file-types';

export interface TreeContextMenu {
  x: number;
  y: number;
  node?: FileTreeNode;
}

export interface TreeClipboard {
  path: string;
  type: FileTreeNode['type'];
  name: string;
}

export interface TreeCreatePrompt {
  kind: 'file' | 'directory';
  parentPath: string;
}
