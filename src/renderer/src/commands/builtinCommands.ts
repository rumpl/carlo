import { getEditor } from '../editor/MonacoEditor';
import { getOrCreateModel, getModel } from '../editor/models';
import { ensureLanguageClient, restartLanguageClient } from '../lsp/LanguageClientService';
import { activeTab, useEditorStore } from '../store/useEditorStore';
import { useCommandStore } from '../store/useCommandStore';
import { useThemeStore } from '../store/useThemeStore';
import { registerCommand } from './registry';

function titleFromPath(path: string): string { return path.split(/[\\/]/).pop() ?? path; }
function rootFor(path: string): { rootPath: string; rootUri: string } { const rootPath = path.split(/[\\/]/).slice(0, -1).join('/') || '/'; return { rootPath, rootUri: new URL(`file://${rootPath}`).toString() }; }

async function openFile(): Promise<void> {
  const file = await window.api.file.openDialog();
  if (!file) return;
  getOrCreateModel(file.uri, file.content, file.languageId);
  const { rootPath, rootUri } = useEditorStore.getState().workspace ?? rootFor(file.path);
  useEditorStore.getState().setWorkspace({ rootPath, rootUri });
  useEditorStore.getState().openFile({ uri: file.uri, path: file.path, languageId: file.languageId, title: titleFromPath(file.path) });
  await ensureLanguageClient(file.languageId, rootUri, file.uri).catch((error) => console.error(error));
}

async function saveFile(): Promise<void> {
  const tab = activeTab();
  if (!tab) return;
  const content = getModel(tab.uri)?.getValue() ?? '';
  await window.api.file.save({ path: tab.path, content });
  useEditorStore.getState().markSaved(tab.uri);
}

async function saveAs(): Promise<void> {
  const tab = activeTab();
  if (!tab) return;
  const content = getModel(tab.uri)?.getValue() ?? '';
  const result = await window.api.file.saveAsDialog({ content, suggestedName: tab.title });
  if (!result) return;
  useEditorStore.getState().markSaved(tab.uri, result.path);
}

export function registerBuiltinCommands(): void {
  registerCommand({ id: 'workbench.action.showCommands', title: 'Show Command Palette', keybinding: 'Ctrl+Shift+P', run: () => useCommandStore.getState().openPalette() });
  registerCommand({ id: 'file.open', title: 'Open File', keybinding: 'Ctrl+O', run: openFile });
  registerCommand({ id: 'workspace.openFolder', title: 'Open Folder', run: async () => { const folder = await window.api.workspace.openFolderDialog(); if (folder) useEditorStore.getState().setWorkspace(folder); } });
  registerCommand({ id: 'file.save', title: 'Save', keybinding: 'Ctrl+S', run: saveFile });
  registerCommand({ id: 'file.saveAs', title: 'Save As', keybinding: 'Ctrl+Shift+S', run: saveAs });
  registerCommand({ id: 'tab.close', title: 'Close Tab', run: () => { const tab = activeTab(); if (tab) useEditorStore.getState().closeTab(tab.id); } });
  registerCommand({ id: 'theme.toggle', title: 'Toggle Theme', run: () => useThemeStore.getState().toggleTheme() });
  registerCommand({ id: 'editor.action.triggerSuggest', title: 'Trigger Suggestions', keybinding: 'Ctrl+Space', run: () => getEditor()?.trigger('keyboard', 'editor.action.triggerSuggest', {}) });
  registerCommand({ id: 'lsp.restart', title: 'Restart Language Server', run: async () => { const tab = activeTab(); const workspace = useEditorStore.getState().workspace; if (tab && workspace) await restartLanguageClient(tab.languageId, workspace.rootUri, tab.uri); } });
}
