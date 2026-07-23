import type { EditorTab } from '../store/useEditorStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { activeTab, isUriOpen, useEditorStore } from '../store/useEditorStore';
import { disposeModel, getModel, replaceModelUri } from './models';
import { invalidateGitBaseline } from './gitGutter';

async function formatActiveTabForSave(tab: EditorTab): Promise<void> {
  const currentTab = activeTab();
  if (currentTab?.id !== tab.id) return;
  const { getEditor } = await import('./editorRegistry');
  const editor = getEditor();
  if (!editor) return;
  const model = getModel(tab.uri);
  if (model && editor.getModel() !== model) editor.setModel(model);
  await editor.getAction('editor.action.formatDocument')?.run();
}

export async function saveTab(tab: EditorTab): Promise<void> {
  const model = getModel(tab.uri);
  const content = model?.getValue() ?? '';
  if (tab.uri.startsWith('untitled:')) {
    const result = await window.api.file.saveAsDialog({ content, suggestedName: tab.title });
    if (!result) throw new Error('Save cancelled');
    const model = replaceModelUri(tab.uri, result.uri, content, result.languageId);
    if (activeTab()?.id === tab.id) {
      const { getEditor } = await import('./editorRegistry');
      getEditor()?.setModel(model);
    }
    invalidateGitBaseline(result.path);
    useEditorStore.getState().markSaved(tab.uri, result);
    return;
  }

  if (useSettingsStore.getState().config.mainView.formatOnSave) {
    await formatActiveTabForSave(tab);
  }
  await window.api.file.save({ path: tab.path, content: getModel(tab.uri)?.getValue() ?? content });
  invalidateGitBaseline(tab.path);
  useEditorStore.getState().markSaved(tab.uri);
}

export async function saveActiveTab(): Promise<void> {
  const tab = activeTab();
  if (!tab) return;
  await saveTab(tab);
}

export async function saveAllTabs(): Promise<void> {
  const dirtyTabs = useEditorStore.getState().tabs.filter((tab) => tab.dirty);
  for (const tab of dirtyTabs) {
    await saveTab(tab);
  }
}

export async function promptToSaveTab(tab: EditorTab): Promise<'saved' | 'discarded' | 'cancelled'> {
  if (!tab.dirty) return 'discarded';
  const choice = await window.api.dialog.unsavedChanges(tab.title);
  if (choice === 'cancel') return 'cancelled';
  if (choice === 'discard') return 'discarded';
  try {
    await saveTab(tab);
    return 'saved';
  } catch (error) {
    if (error instanceof Error && error.message === 'Save cancelled') return 'cancelled';
    console.error(error);
    window.alert(error instanceof Error ? error.message : `Failed to save ${tab.title}.`);
    return 'cancelled';
  }
}

export async function closeTabWithPrompt(
  tab: EditorTab,
  groupId = useEditorStore.getState().activeGroupId,
): Promise<boolean> {
  const state = useEditorStore.getState();
  const groupContainsTab = state.groups
    .find((group) => group.id === groupId)
    ?.tabIds.includes(tab.id);
  if (!groupContainsTab) return false;

  const isOpenInAnotherGroup = state.groups.some(
    (group) => group.id !== groupId && group.tabIds.includes(tab.id),
  );
  if (!isOpenInAnotherGroup) {
    const result = await promptToSaveTab(tab);
    if (result === 'cancelled') return false;
  }

  const closed = useEditorStore.getState().closeTabInGroup(tab.id, groupId);
  if (closed && !isUriOpen(closed.uri)) disposeModel(closed.uri);
  return true;
}

export async function handleWindowCloseRequest(): Promise<void> {
  for (const tab of useEditorStore.getState().tabs.filter((candidate) => candidate.dirty)) {
    const result = await promptToSaveTab(tab);
    if (result === 'cancelled') {
      await window.api.window.closeCancel();
      return;
    }
  }
  await window.api.window.closeProceed();
}
