import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { FileTreeNode, WorkspaceFolderResult } from '@shared/file-types';
import { languageIdFromPath } from '@shared/language-registry';
import { useEditorStore } from '../../store/useEditorStore';
import type { useWorkspaceTree } from './useWorkspaceTree';
import type { TreeClipboard, TreeContextMenu, TreeCreatePrompt } from './types';
import { hasValidChildName, parentDirectory, titleFromPath } from './treeUtils';

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
  };
}
