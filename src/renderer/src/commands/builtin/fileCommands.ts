import { getEditor } from '../../editor/editorRegistry';
import { getModel, getOrCreateModel } from '../../editor/models';
import { closeTabWithPrompt, saveActiveTab, saveAllTabs } from '../../editor/saveActions';
import { ensureLanguageClient } from '../../lsp/LanguageClientService';
import { activeTab, useEditorStore } from '../../store/useEditorStore';
import { registerCommand } from '../registry';
import { formatDocumentForSave } from './editorCommands';
import { rootFor, titleFromPath } from './pathUtils';

function nextUntitledTitle(): string {
  const tabs = useEditorStore.getState().tabs;
  for (let index = 1; ; index += 1) {
    const title = `Untitled-${index}`;
    if (!tabs.some((tab) => tab.title === title && tab.uri.startsWith('untitled:'))) return title;
  }
}

function newFile(): void {
  const title = nextUntitledTitle();
  const uri = `untitled:${title}`;
  getOrCreateModel(uri, '', 'plaintext');
  useEditorStore.getState().openFile({ uri, path: title, languageId: 'plaintext', title });
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
  await ensureLanguageClient(file.languageId, rootUri, file.uri).catch((error) => console.error(error));
}

async function saveFile(): Promise<void> {
  await saveActiveTab();
}

async function saveAs(): Promise<void> {
  const tab = activeTab();
  if (!tab) return;
  await formatDocumentForSave();
  const content = getModel(tab.uri)?.getValue() ?? '';
  const result = await window.api.file.saveAsDialog({ content, suggestedName: tab.title });
  if (!result) return;
  const { replaceModelUri } = await import('../../editor/models');
  const model = replaceModelUri(tab.uri, result.uri, content, result.languageId);
  getEditor()?.setModel(model);
  useEditorStore.getState().markSaved(tab.uri, result);
}

export function registerFileCommands(): void {
  registerCommand({ id: 'file.new', title: 'New File', keybinding: 'Ctrl+N', run: newFile });
  registerCommand({ id: 'file.open', title: 'Open File', keybinding: 'Ctrl+O', run: openFile });
  registerCommand({ id: 'file.save', title: 'Save', keybinding: 'Ctrl+S', run: saveFile });
  registerCommand({ id: 'file.saveAll', title: 'Save All', run: saveAllTabs });
  registerCommand({ id: 'file.saveAs', title: 'Save As', keybinding: 'Ctrl+Shift+S', run: saveAs });
  registerCommand({
    id: 'tab.close',
    title: 'Close Tab',
    keybinding: 'Ctrl+W',
    run: () => {
      const tab = activeTab();
      if (tab) void closeTabWithPrompt(tab);
    },
  });
}
