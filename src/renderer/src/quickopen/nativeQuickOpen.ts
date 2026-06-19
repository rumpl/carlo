import { getService, IQuickInputService } from '@codingame/monaco-vscode-api/services';
import type { IQuickPickItem } from '@codingame/monaco-vscode-api/vscode/vs/platform/quickinput/common/quickInput';
import type { FileTreeNode } from '@shared/file-types';
import { languageIdFromPath } from '@shared/language-registry';
import { getOrCreateModel } from '../editor/models';
import { ensureLanguageClient } from '../lsp/LanguageClientService';
import { useEditorStore } from '../store/useEditorStore';

interface QuickOpenItem extends IQuickPickItem {
  path: string;
  uri: string;
}

function flatten(nodes: FileTreeNode[], rootPath: string): QuickOpenItem[] {
  return nodes.flatMap((node) => {
    if (node.type === 'directory') return flatten(node.children ?? [], rootPath);
    const relativePath = node.path.startsWith(rootPath) ? node.path.slice(rootPath.length + 1) : node.path;
    const slash = relativePath.lastIndexOf('/');
    return [
      {
        label: node.name,
        description: slash >= 0 ? relativePath.slice(0, slash) : undefined,
        detail: relativePath,
        tooltip: node.path,
        path: node.path,
        uri: node.uri,
      },
    ];
  });
}

function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
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
    });
    picker.items = flatten(tree.children, workspace.rootPath);
  } catch (error) {
    picker.items = [{ label: 'Failed to load workspace files', description: error instanceof Error ? error.message : String(error), path: '', uri: '' }];
  } finally {
    picker.busy = false;
  }
}
