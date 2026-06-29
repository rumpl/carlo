import { icons } from '@iconify-json/vscode-icons';
import type { IconifyIcon } from '@iconify/types';
import type { FileTreeNode } from '@shared/file-types';
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';

function iconNameFromFileName(fileName: string): string {
  return fileName.replace(/\.svg$/, '').replaceAll('_', '-');
}

export function iconForNode(node: FileTreeNode, expanded: boolean): IconifyIcon {
  const fileName =
    node.type === 'directory'
      ? expanded
        ? getIconForOpenFolder(node.name)
        : getIconForFolder(node.name)
      : (getIconForFile(node.name) ?? 'default_file.svg');
  return icons.icons[iconNameFromFileName(fileName)] ?? icons.icons['default-file']!;
}
