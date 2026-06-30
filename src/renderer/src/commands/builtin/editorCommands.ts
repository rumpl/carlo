import { getEditor, setEditorsWordWrap } from '../../editor/editorRegistry';
import { softWrapEnabled } from '../../editor/editorOptions';
import { getModel } from '../../editor/models';
import { navigateBack, navigateForward } from '../../editor/navigationHistory';
import { ensureLanguageClient } from '../../lsp/LanguageClientService';
import { isMarkdownTab, markdownPreviewUri } from '../../markdown/previewTabs';
import { activeTab, useEditorStore } from '../../store/useEditorStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { registerCommand } from '../registry';
import { rootFor, titleFromPath } from './pathUtils';

async function withActiveEditorLsp(actionId: string): Promise<void> {
  const tab = activeTab();
  const editor = getEditor();
  if (!tab || !editor) return;

  const workspace = useEditorStore.getState().workspace ?? rootFor(tab.path);
  await ensureLanguageClient(tab.languageId, workspace.rootUri, tab.uri).catch((error) =>
    console.error(error),
  );

  const model = getModel(tab.uri);
  if (model && editor.getModel() !== model) editor.setModel(model);
  editor.focus();
  await editor.getAction(actionId)?.run();
}

export async function formatDocumentForSave(): Promise<void> {
  if (!useSettingsStore.getState().config.mainView.formatOnSave) return;
  await withActiveEditorLsp('editor.action.formatDocument').catch((error) =>
    console.error('Format on save failed', error),
  );
}

function toggleSoftWrap(): void {
  setEditorsWordWrap(!softWrapEnabled());
}

function openMarkdownPreviewToSide(): void {
  const tab = activeTab();
  if (!isMarkdownTab(tab)) {
    window.alert('Open a Markdown file first.');
    return;
  }

  const store = useEditorStore.getState();
  const sourceGroupId = store.activeGroupId;
  const sideGroup = store.groups.find((group) => group.id !== sourceGroupId);
  if (sideGroup) {
    store.setActiveGroup(sideGroup.id);
  } else {
    store.splitActive('vertical');
  }

  useEditorStore.getState().openFile({
    uri: markdownPreviewUri(tab.uri),
    path: tab.path,
    languageId: 'markdown',
    title: `Preview ${titleFromPath(tab.path)}`,
  });
}

async function runEditorAction(actionId: string): Promise<void> {
  const editor = getEditor();
  if (!editor) return;
  editor.focus();
  await editor.getAction(actionId)?.run();
}

export function registerEditorCommands(): void {
  // LSP-backed commands – each delegates to withActiveEditorLsp
  const lspCommands: { id: string; title: string; keybinding?: string }[] = [
    { id: 'editor.action.formatDocument', title: 'Format Document' },
    { id: 'editor.action.rename', title: 'Rename Symbol', keybinding: 'F2' },
    { id: 'editor.action.quickFix', title: 'Quick Fix...', keybinding: 'Ctrl+.' },
    { id: 'editor.action.sourceAction', title: 'Source Action...' },
    { id: 'editor.action.revealDefinition', title: 'Go to Definition', keybinding: 'F12' },
    { id: 'editor.action.peekDefinition', title: 'Peek Definition', keybinding: 'Alt+F12' },
    {
      id: 'editor.action.referenceSearch.trigger',
      title: 'Find References',
      keybinding: 'Shift+F12',
    },
    { id: 'editor.action.goToImplementation', title: 'Go to Implementation' },
    { id: 'editor.action.goToTypeDefinition', title: 'Go to Type Definition' },
  ];
  for (const cmd of lspCommands) {
    registerCommand({ ...cmd, run: () => withActiveEditorLsp(cmd.id) });
  }

  // Plain editor-action commands – each delegates to runEditorAction
  const editorActionCommands: { id: string; title: string; keybinding?: string }[] = [
    { id: 'actions.find', title: 'Find', keybinding: 'Ctrl+F' },
    {
      id: 'editor.action.startFindReplaceAction',
      title: 'Replace',
      keybinding: 'Ctrl+H',
    },
    {
      id: 'editor.action.nextMatchFindAction',
      title: 'Find Next',
      keybinding: 'F3',
    },
    {
      id: 'editor.action.previousMatchFindAction',
      title: 'Find Previous',
      keybinding: 'Shift+F3',
    },
  ];
  for (const cmd of editorActionCommands) {
    registerCommand({ ...cmd, run: () => runEditorAction(cmd.id) });
  }

  registerCommand({
    id: 'editor.toggleSoftWrap',
    title: 'Editor: Toggle Soft Wrap',
    run: toggleSoftWrap,
  });
  registerCommand({
    id: 'markdown.showPreviewToSide',
    title: 'Markdown: Open Preview to the Side',
    keybinding: 'Ctrl+Shift+V',
    run: openMarkdownPreviewToSide,
  });
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
    id: 'editor.action.triggerSuggest',
    title: 'Trigger Suggestions',
    keybinding: 'Ctrl+Space',
    run: () => getEditor()?.trigger('keyboard', 'editor.action.triggerSuggest', {}),
  });
}
