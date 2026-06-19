import { getEditor, setEditorsSoftWrap } from '../../editor/MonacoEditor';
import { toggleSoftWrapEnabled } from '../../editor/editorOptions';
import { getModel } from '../../editor/models';
import { navigateBack, navigateForward } from '../../editor/navigationHistory';
import { ensureLanguageClient } from '../../lsp/LanguageClientService';
import { activeTab, useEditorStore } from '../../store/useEditorStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { registerCommand } from '../registry';
import { rootFor } from './pathUtils';

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
  await editor.getAction(actionId)?.run();
}

async function formatDocument(): Promise<void> {
  await withActiveEditorLsp('editor.action.formatDocument');
}

async function renameSymbol(): Promise<void> {
  await withActiveEditorLsp('editor.action.rename');
}

async function quickFix(): Promise<void> {
  await withActiveEditorLsp('editor.action.quickFix');
}

async function sourceAction(): Promise<void> {
  await withActiveEditorLsp('editor.action.sourceAction');
}

export async function formatDocumentForSave(): Promise<void> {
  if (!useSettingsStore.getState().config.mainView.formatOnSave) return;
  await formatDocument().catch((error) => console.error('Format on save failed', error));
}

function toggleSoftWrap(): void {
  setEditorsSoftWrap(toggleSoftWrapEnabled());
}

async function runEditorAction(actionId: string): Promise<void> {
  const editor = getEditor();
  if (!editor) return;
  editor.focus();
  await editor.getAction(actionId)?.run();
}

export function registerEditorCommands(): void {
  registerCommand({
    id: 'editor.action.formatDocument',
    title: 'Format Document',
    run: formatDocument,
  });
  registerCommand({
    id: 'editor.action.rename',
    title: 'Rename Symbol',
    keybinding: 'F2',
    run: renameSymbol,
  });
  registerCommand({
    id: 'editor.action.quickFix',
    title: 'Quick Fix...',
    keybinding: 'Ctrl+.',
    run: quickFix,
  });
  registerCommand({
    id: 'editor.action.sourceAction',
    title: 'Source Action...',
    run: sourceAction,
  });
  registerCommand({
    id: 'editor.toggleSoftWrap',
    title: 'Editor: Toggle Soft Wrap',
    run: toggleSoftWrap,
  });
  registerCommand({
    id: 'actions.find',
    title: 'Find',
    keybinding: 'Ctrl+F',
    run: () => runEditorAction('actions.find'),
  });
  registerCommand({
    id: 'editor.action.startFindReplaceAction',
    title: 'Replace',
    keybinding: 'Ctrl+H',
    run: () => runEditorAction('editor.action.startFindReplaceAction'),
  });
  registerCommand({
    id: 'editor.action.nextMatchFindAction',
    title: 'Find Next',
    keybinding: 'F3',
    run: () => runEditorAction('editor.action.nextMatchFindAction'),
  });
  registerCommand({
    id: 'editor.action.previousMatchFindAction',
    title: 'Find Previous',
    keybinding: 'Shift+F3',
    run: () => runEditorAction('editor.action.previousMatchFindAction'),
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
