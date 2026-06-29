import { getService, IQuickInputService } from '@codingame/monaco-vscode-api/services';
import type { IQuickPickItem } from '@codingame/monaco-vscode-api/vscode/vs/platform/quickinput/common/quickInput';
import type { FileTreeNode } from '@shared/file-types';
import { languageIdFromPath } from '@shared/language-registry';
import { getOrCreateModel } from '../editor/models';
import { ensureLanguageClient } from '../lsp/LanguageClientService';
import { type RecentFile, useEditorStore } from '../store/useEditorStore';
import { titleFromPath } from '../commands/builtin/pathUtils';

interface QuickOpenItem extends IQuickPickItem {
  path: string;
  uri: string;
  recent?: boolean;
}

function relativePath(path: string, rootPath: string): string {
  return path.startsWith(rootPath) ? path.slice(rootPath.length + 1) : path;
}

function itemForFile(file: RecentFile, rootPath: string, recent = false): QuickOpenItem {
  const relative = relativePath(file.path, rootPath);
  const slash = relative.lastIndexOf('/');
  return {
    label: file.title,
    description: [recent ? 'recent' : undefined, slash >= 0 ? relative.slice(0, slash) : undefined]
      .filter(Boolean)
      .join(' · ') || undefined,
    detail: relative,
    tooltip: file.path,
    path: file.path,
    uri: file.uri,
    recent,
  };
}

function flatten(nodes: FileTreeNode[], rootPath: string): QuickOpenItem[] {
  return nodes.flatMap((node) => {
    if (node.type === 'directory') return flatten(node.children ?? [], rootPath);
    return [itemForFile({ uri: node.uri, path: node.path, languageId: languageIdFromPath(node.path), title: node.name }, rootPath)];
  });
}

async function openFile(item: QuickOpenItem): Promise<void> {
  const workspace = useEditorStore.getState().workspace;
  const languageId = languageIdFromPath(item.path);
  const file = await window.api.file.read(item.path);
  getOrCreateModel(item.uri, file.content, languageId);
  useEditorStore.getState().openFile({ uri: item.uri, path: item.path, languageId, title: titleFromPath(item.path) });
  if (workspace) await ensureLanguageClient(languageId, workspace.rootUri, item.uri).catch(console.error);
}

export async function showNativeQuickOpen(): Promise<void> {
  const workspace = useEditorStore.getState().workspace;
  if (!workspace) return;

  const quickInputService = await getService(IQuickInputService);
  const picker = quickInputService.createQuickPick<QuickOpenItem>();
  picker.placeholder = 'Go to File';
  picker.matchOnDescription = true;
  picker.matchOnDetail = true;
  picker.sortByLabel = false;
  picker.busy = true;
  picker.items = [];
  picker.show();

  const disposables = [
    picker.onDidAccept(() => {
      const item = picker.activeItems[0] ?? picker.selectedItems[0];
      if (!item) return;
      picker.hide();
      void openFile(item);
    }),
    picker.onDidHide(() => {
      disposables.forEach((disposable) => disposable.dispose());
      picker.dispose();
    }),
  ];

  try {
    const tree = await window.api.workspace.listTree(workspace.rootPath, {
      recursive: true,
      watch: false,
      gitStatus: false,
    });
    const files = flatten(tree.children, workspace.rootPath);
    const recentFiles = useEditorStore
      .getState()
      .recentFiles.filter((file) => file.path.startsWith(workspace.rootPath));
    const recentItems = recentFiles.map((file) => itemForFile(file, workspace.rootPath, true));
    const recentUris = new Set(recentItems.map((item) => item.uri));
    picker.items = [...recentItems, ...files.filter((file) => !recentUris.has(file.uri))];
  } catch (error) {
    picker.items = [{ label: 'Failed to load workspace files', description: error instanceof Error ? error.message : String(error), path: '', uri: '' }];
  } finally {
    picker.busy = false;
  }
}
