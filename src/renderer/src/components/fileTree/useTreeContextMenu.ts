import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { FileTreeNode, WorkspaceFolderResult } from '@shared/file-types';
import { useContextMenuDismiss } from '../../hooks/useContextMenuDismiss';
import type { TreeContextMenu } from './types';

export function useTreeContextMenu(workspace: WorkspaceFolderResult | undefined) {
  const [contextMenu, setContextMenu] = useState<TreeContextMenu | undefined>(undefined);

  function openContextMenu(event: MouseEvent, node?: FileTreeNode): void {
    if (!workspace) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }

  function closeContextMenu(): void {
    setContextMenu(undefined);
  }

  useContextMenuDismiss(contextMenu !== undefined, closeContextMenu);

  return { contextMenu, openContextMenu, closeContextMenu };
}
