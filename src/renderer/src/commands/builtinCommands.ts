import { getEditor, setEditorsSoftWrap } from '../editor/MonacoEditor';
import { toggleSoftWrapEnabled } from '../editor/editorOptions';
import { getOrCreateModel, getModel } from '../editor/models';
import { ensureLanguageClient, restartLanguageClient } from '../lsp/LanguageClientService';
import { navigateBack, navigateForward } from '../editor/navigationHistory';
import { showNativeCommandPalette } from '../quickopen/nativeCommandPalette';
import { showNativeQuickOpen } from '../quickopen/nativeQuickOpen';
import { showThemeSelector } from '../quickopen/themeSelector';
import { activeTab, useEditorStore } from '../store/useEditorStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProblemsStore } from '../store/useProblemsStore';
import { useSearchStore } from '../store/useSearchStore';
import { navigateProblem } from '../problems/navigation';
import { closeTabWithPrompt, saveActiveTab, saveAllTabs } from '../editor/saveActions';
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

async function formatDocumentForSave(): Promise<void> {
  await formatDocument().catch((error) => console.error('Format on save failed', error));
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
  const { replaceModelUri } = await import('../editor/models');
  const model = replaceModelUri(tab.uri, result.uri, content, result.languageId);
  getEditor()?.setModel(model);
  useEditorStore.getState().markSaved(tab.uri, result);
}

async function openLanguageConfig(): Promise<void> {
  const { path } = await window.api.config.languagePath();
  await openJsonConfigFile(path);
}

async function openUserConfig(): Promise<void> {
  const { path } = await window.api.config.userPath();
  await openJsonConfigFile(path);
}

async function openJsonConfigFile(path: string): Promise<void> {
  const file = await window.api.file.read(path);
  const uri = new URL(`file://${path}`).toString();
  getOrCreateModel(uri, file.content, 'json');
  useEditorStore.getState().openFile({ uri, path, languageId: 'json', title: titleFromPath(path) });
}

function openSettings(): void {
  const settingsStore = useSettingsStore.getState();
  settingsStore.openSettings();
  void settingsStore.loadSettings().catch(console.error);
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

async function installCommandLine(): Promise<void> {
  const result = await window.api.app.installCommandLine();
  if (result.ok) {
    window.alert(
      [`Installed the 'carlo' shell command at:`, result.path, result.warning]
        .filter(Boolean)
        .join('\n\n'),
    );
    return;
  }

  window.alert(
    [`Could not install the 'carlo' shell command.`, result.error, result.instructions]
      .filter(Boolean)
      .join('\n\n'),
  );
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
    id: 'app.installCommandLine',
    title: "Shell Command: Install 'carlo' Command in PATH",
    run: installCommandLine,
  });
  registerCommand({
    id: 'workspace.openFolder',
    title: 'Open Folder',
    run: async () => {
      const folder = await window.api.workspace.openFolderDialog();
      if (folder) useEditorStore.getState().setWorkspace(folder);
    },
  });
  registerCommand({ id: 'file.save', title: 'Save', keybinding: 'Ctrl+S', run: saveFile });
  registerCommand({ id: 'file.saveAll', title: 'Save All', run: saveAllTabs });
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
    id: 'workbench.action.findInFiles',
    title: 'Search: Find in Files',
    keybinding: 'Ctrl+Shift+F',
    run: () => useSearchStore.getState().openSearch(),
  });
  registerCommand({
    id: 'workbench.panel.problems.toggle',
    title: 'View: Toggle Problems',
    keybinding: 'Ctrl+Shift+M',
    run: () => useProblemsStore.getState().toggleProblems(),
  });
  registerCommand({
    id: 'editor.action.marker.next',
    title: 'Go to Next Problem',
    keybinding: 'F8',
    run: () => navigateProblem('next'),
  });
  registerCommand({
    id: 'editor.action.marker.prev',
    title: 'Go to Previous Problem',
    keybinding: 'Shift+F8',
    run: () => navigateProblem('previous'),
  });
  registerCommand({
    id: 'preferences.openSettings',
    title: 'Preferences: Open Settings',
    keybinding: 'Ctrl+,',
    run: openSettings,
  });
  registerCommand({
    id: 'preferences.openUserConfig',
    title: 'Preferences: Open User Config',
    run: openUserConfig,
  });
  registerCommand({
    id: 'preferences.openLanguageConfig',
    title: 'Preferences: Open Language Config',
    run: openLanguageConfig,
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
      if (tab) void closeTabWithPrompt(tab);
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
