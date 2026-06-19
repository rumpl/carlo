import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { FileTreeNode, WorkspaceFolderResult } from '@shared/file-types';
import { languageIdFromPath } from '@shared/language-registry';
import { useEditorStore } from '../../store/useEditorStore';
import type { useWorkspaceTree } from './useWorkspaceTree';
import type { TreeClipboard, TreeContextMenu, TreeCreatePrompt } from './types';
import { hasValidChildName, normalizePath, parentDirectory, titleFromPath } from './treeUtils';

type WorkspaceTree = ReturnType<typeof useWorkspaceTree>;

export function useFileTreeOperations({
  workspace,
  tree,
  closeContextMenu,
}: {
  workspace: WorkspaceFolderResult | undefined;
  tree: WorkspaceTree;
  closeContextMenu: () => void;
}) {
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const [clipboard, setClipboard] = useState<TreeClipboard | undefined>(undefined);
  const [createPrompt, setCreatePrompt] = useState<TreeCreatePrompt | undefined>(undefined);
  const [createName, setCreateName] = useState('');

  useEffect(() => {
    if (!createPrompt) return;
    const handle = window.setTimeout(() => createInputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [createPrompt]);

  async function openNode(node: FileTreeNode): Promise<void> {
    const languageId = languageIdFromPath(node.path);
    const file = await window.api.file.read(node.path);
    const { getOrCreateModel } = await import('../../editor/models');
    getOrCreateModel(node.uri, file.content, languageId);
    useEditorStore
      .getState()
      .openFile({ uri: node.uri, path: node.path, languageId, title: titleFromPath(node.path) });
    if (workspace) {
      const { ensureLanguageClient } = await import('../../lsp/LanguageClientService');
      await ensureLanguageClient(languageId, workspace.rootUri, node.uri).catch(console.error);
    }
  }

  function targetDirectory(menu: TreeContextMenu): string | undefined {
    if (!workspace) return undefined;
    if (!menu.node) return workspace.rootPath;
    return menu.node.type === 'directory' ? menu.node.path : parentDirectory(menu.node.path);
  }

  async function runFileOperation(operation: () => Promise<void>): Promise<void> {
    closeContextMenu();
    try {
      await operation();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'File operation failed');
    }
  }

  function startCreate(menu: TreeContextMenu, kind: TreeCreatePrompt['kind']): void {
    const parentPath = targetDirectory(menu);
    if (!parentPath) return;
    closeContextMenu();
    setCreateName('');
    tree.expandPath(parentPath);
    void tree.ensureDirectoryLoaded(parentPath).catch(console.error);
    setCreatePrompt({ kind, parentPath });
  }

  async function submitCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!createPrompt) return;

    const trimmedName = createName.trim();
    if (!hasValidChildName(trimmedName)) {
      window.alert(`Please enter a valid ${createPrompt.kind === 'directory' ? 'folder' : 'file'} name.`);
      return;
    }

    try {
      if (createPrompt.kind === 'directory') {
        await window.api.file.createDirectory({ parentPath: createPrompt.parentPath, name: trimmedName });
      } else {
        await window.api.file.create({ parentPath: createPrompt.parentPath, name: trimmedName });
      }
      tree.expandPath(createPrompt.parentPath);
      await tree.refreshDirectory(createPrompt.parentPath);
      cancelCreate();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'File operation failed');
    }
  }

  function cancelCreate(): void {
    setCreatePrompt(undefined);
    setCreateName('');
  }

  function copyNode(menu: TreeContextMenu): void {
    if (!menu.node) return;
    setClipboard({ path: menu.node.path, type: menu.node.type, name: menu.node.name });
    closeContextMenu();
  }

  function pasteNode(menu: TreeContextMenu): void {
    const parentPath = targetDirectory(menu);
    if (!clipboard || !parentPath) return;
    void runFileOperation(async () => {
      await window.api.file.copy({ sourcePath: clipboard.path, destinationDirectory: parentPath });
      tree.expandPath(parentPath);
      await tree.refreshDirectory(parentPath);
    });
  }

  function deleteNode(menu: TreeContextMenu): void {
    if (!menu.node) return;
    const parentPath = parentDirectory(menu.node.path);
    const kind = menu.node.type === 'directory' ? 'folder' : 'file';
    if (!window.confirm(`Delete ${kind} “${menu.node.name}”?`)) return;
    void runFileOperation(async () => {
      await window.api.file.delete({ path: menu.node!.path });
      await tree.refreshDirectory(parentPath);
    });
  }

  function renameNode(menu: TreeContextMenu): void {
    if (!menu.node) return;
    const newName = window.prompt(`Rename “${menu.node.name}” to:`, menu.node.name)?.trim();
    if (newName === undefined || newName === menu.node.name) {
      closeContextMenu();
      return;
    }
    if (!hasValidChildName(newName)) {
      window.alert('Please enter a valid name.');
      return;
    }
    const parentPath = parentDirectory(menu.node.path);
    void runFileOperation(async () => {
      const oldPath = menu.node!.path;
      const result = await window.api.file.rename({ path: oldPath, newName });
      const tabsToRename = useEditorStore
        .getState()
        .tabs.filter((tab) => tab.path === oldPath || tab.path.startsWith(`${oldPath}${oldPath.includes('\\') ? '\\' : '/'}`));
      if (tabsToRename.length > 0) {
        const { replaceModelUri, getModel } = await import('../../editor/models');
        for (const tab of tabsToRename) {
          const nextPath = tab.path === oldPath ? result.path : `${result.path}${tab.path.slice(oldPath.length)}`;
          const content = getModel(tab.uri)?.getValue();
          if (content !== undefined) replaceModelUri(tab.uri, new URL(`file://${nextPath}`).toString(), content, languageIdFromPath(nextPath));
        }
        useEditorStore.getState().updateRenamedPath(oldPath, result.path, result.uri);
      }
      await tree.refreshDirectory(parentPath);
    });
  }

  function relativePath(path: string): string {
    if (!workspace) return path;
    const root = normalizePath(workspace.rootPath).replace(/\/+$/, '');
    const normalizedPath = normalizePath(path);
    return normalizedPath.startsWith(`${root}/`) ? normalizedPath.slice(root.length + 1) : path;
  }

  function copyAbsolutePath(menu: TreeContextMenu): void {
    if (!menu.node) return;
    void navigator.clipboard.writeText(menu.node.path).catch(console.error);
    closeContextMenu();
  }

  function copyRelativePath(menu: TreeContextMenu): void {
    if (!menu.node) return;
    void navigator.clipboard.writeText(relativePath(menu.node.path)).catch(console.error);
    closeContextMenu();
  }

  function revealInFolder(menu: TreeContextMenu): void {
    if (!menu.node) return;
    void window.api.file.revealInFolder(menu.node.path).catch(console.error);
    closeContextMenu();
  }

  return {
    clipboard,
    createInputRef,
    createPrompt,
    createName,
    setCreateName,
    cancelCreate,
    submitCreate,
    openNode,
    startCreate,
    copyNode,
    pasteNode,
    deleteNode,
    renameNode,
    copyAbsolutePath,
    copyRelativePath,
    revealInFolder,
  };
}
