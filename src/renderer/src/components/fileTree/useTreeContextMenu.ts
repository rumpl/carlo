import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import type { FileTreeNode, WorkspaceFolderResult } from '@shared/file-types';
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

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(undefined);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [contextMenu]);

  return { contextMenu, openContextMenu, closeContextMenu };
}
