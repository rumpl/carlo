import { getEditor } from '../editor/MonacoEditor';
import { getOrCreateModel, getModel, replaceModelUri } from '../editor/models';
import { ensureLanguageClient, restartLanguageClient } from '../lsp/LanguageClientService';
import { navigateBack, navigateForward } from '../editor/navigationHistory';
import { showNativeCommandPalette } from '../quickopen/nativeCommandPalette';
import { showNativeQuickOpen } from '../quickopen/nativeQuickOpen';
import { showThemeSelector } from '../quickopen/themeSelector';
import { activeTab, useEditorStore } from '../store/useEditorStore';
import { registerCommand } from './registry';

function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
function rootFor(path: string): { rootPath: string; rootUri: string; name: string } {
  const rootPath = path.split(/[\\/]/).slice(0, -1).join('/') || '/';
  return {
    rootPath,
    rootUri: new URL(`file://${rootPath}`).toString(),
    name: rootPath.split(/[\\/]/).pop() ?? rootPath,
  };
}

async function openFile(): Promise<void> {
  const file = await window.api.file.openDialog();
  if (!file) return;
  getOrCreateModel(file.uri, file.content, file.languageId);
  const workspace = useEditorStore.getState().workspace ?? rootFor(file.path);
  const { rootUri } = workspace;
  useEditorStore.getState().setWorkspace(workspace);
  useEditorStore.getState().openFile({
    uri: file.uri,
    path: file.path,
    languageId: file.languageId,
    title: titleFromPath(file.path),
  });
  await ensureLanguageClient(file.languageId, rootUri, file.uri).catch((error) =>
    console.error(error),
  );
}

async function saveFile(): Promise<void> {
  const tab = activeTab();
  if (!tab) return;
  const content = getModel(tab.uri)?.getValue() ?? '';
  if (tab.uri.startsWith('untitled:')) {
    await saveAs();
    return;
  }
  await window.api.file.save({ path: tab.path, content });
  useEditorStore.getState().markSaved(tab.uri);
}

async function saveAs(): Promise<void> {
  const tab = activeTab();
  if (!tab) return;
  const content = getModel(tab.uri)?.getValue() ?? '';
  const result = await window.api.file.saveAsDialog({ content, suggestedName: tab.title });
  if (!result) return;
  const model = replaceModelUri(tab.uri, result.uri, content, result.languageId);
  getEditor()?.setModel(model);
  useEditorStore.getState().markSaved(tab.uri, result);
}

export function registerBuiltinCommands(): void {
  registerCommand({
    id: 'workbench.action.showCommands',
    title: 'Show Command Palette',
    keybinding: 'Ctrl+Shift+P',
    run: showNativeCommandPalette,
  });
  registerCommand({
    id: 'workbench.action.quickOpen',
    title: 'Quick Open File',
    keybinding: 'Ctrl+P',
    run: showNativeQuickOpen,
  });
  registerCommand({ id: 'file.open', title: 'Open File', keybinding: 'Ctrl+O', run: openFile });
  registerCommand({
    id: 'workspace.openFolder',
    title: 'Open Folder',
    run: async () => {
      const folder = await window.api.workspace.openFolderDialog();
      if (folder) useEditorStore.getState().setWorkspace(folder);
    },
  });
  registerCommand({ id: 'file.save', title: 'Save', keybinding: 'Ctrl+S', run: saveFile });
  registerCommand({
    id: 'window.zoomIn',
    title: 'Zoom In',
    keybinding: 'Ctrl+=',
    run: async () => {
      await window.api.window.zoomIn();
    },
  });
  registerCommand({
    id: 'window.zoomOut',
    title: 'Zoom Out',
    keybinding: 'Ctrl+-',
    run: async () => {
      await window.api.window.zoomOut();
    },
  });
  registerCommand({
    id: 'window.zoomReset',
    title: 'Reset Zoom',
    keybinding: 'Ctrl+0',
    run: async () => {
      await window.api.window.zoomReset();
    },
  });
  registerCommand({ id: 'file.saveAs', title: 'Save As', keybinding: 'Ctrl+Shift+S', run: saveAs });
  registerCommand({
    id: 'workbench.action.navigateBack',
    title: 'Go Back',
    keybinding: 'Ctrl+[',
    run: navigateBack,
  });
  registerCommand({
    id: 'workbench.action.navigateForward',
    title: 'Go Forward',
    keybinding: 'Ctrl+]',
    run: navigateForward,
  });
  registerCommand({
    id: 'workbench.action.splitEditorRight',
    title: 'Split Editor Right',
    keybinding: 'Ctrl+Alt+Right',
    run: () => useEditorStore.getState().splitActive('vertical'),
  });
  registerCommand({
    id: 'workbench.action.splitEditorDown',
    title: 'Split Editor Down',
    keybinding: 'Ctrl+Alt+Down',
    run: () => useEditorStore.getState().splitActive('horizontal'),
  });
  registerCommand({
    id: 'tab.close',
    title: 'Close Tab',
    keybinding: 'Ctrl+W',
    run: () => {
      const tab = activeTab();
      if (tab) useEditorStore.getState().closeTab(tab.id);
    },
  });
  registerCommand({
    id: 'workbench.action.selectTheme',
    title: 'Preferences: Color Theme',
    run: showThemeSelector,
  });
  registerCommand({
    id: 'editor.action.triggerSuggest',
    title: 'Trigger Suggestions',
    keybinding: 'Ctrl+Space',
    run: () => getEditor()?.trigger('keyboard', 'editor.action.triggerSuggest', {}),
  });
  registerCommand({
    id: 'lsp.restart',
    title: 'Restart Language Server',
    run: async () => {
      const tab = activeTab();
      const workspace = useEditorStore.getState().workspace;
      if (tab && workspace) await restartLanguageClient(tab.languageId, workspace.rootUri, tab.uri);
    },
  });
}
