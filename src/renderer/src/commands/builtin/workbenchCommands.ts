import { restartLanguageClient } from '../../lsp/LanguageClientService';
import { navigateProblem } from '../../problems/navigation';
import { useEditorStore, activeTab } from '../../store/useEditorStore';
import { useProblemsStore } from '../../store/useProblemsStore';
import { useSearchStore } from '../../store/useSearchStore';
import { registerCommand } from '../registry';

export function registerWorkbenchCommands(): void {
  registerCommand({
    id: 'workspace.openFolder',
    title: 'Open Folder',
    run: async () => {
      const folder = await window.api.workspace.openFolderDialog();
      if (folder) useEditorStore.getState().setWorkspace(folder);
    },
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
    id: 'lsp.restart',
    title: 'Restart Language Server',
    run: async () => {
      const tab = activeTab();
      const workspace = useEditorStore.getState().workspace;
      if (tab && workspace) await restartLanguageClient(tab.languageId, workspace.rootUri, tab.uri);
    },
  });
}
