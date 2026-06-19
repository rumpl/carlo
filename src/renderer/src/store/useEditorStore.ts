import { create } from 'zustand';
import type { LanguageId } from '@shared/language-registry';

export interface EditorTab {
  id: string;
  uri: string;
  path: string;
  languageId: LanguageId;
  title: string;
  dirty: boolean;
}

interface WorkspaceState {
  rootUri: string;
  rootPath: string;
}

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  workspace: WorkspaceState | null;
  setWorkspace: (workspace: WorkspaceState) => void;
  openFile: (tab: Omit<EditorTab, 'id' | 'dirty'>) => void;
  closeTab: (id: string) => EditorTab | undefined;
  setActive: (id: string) => void;
  markDirty: (uri: string) => void;
  markSaved: (uri: string, nextPath?: string) => void;
}

const titleFromPath = (path: string) => path.split(/[\\/]/).pop() ?? path;

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),
  openFile: (tab) =>
    set((state) => {
      const existing = state.tabs.find((candidate) => candidate.uri === tab.uri);
      if (existing) return { activeTabId: existing.id };
      const id = crypto.randomUUID();
      return { tabs: [...state.tabs, { ...tab, id, dirty: false }], activeTabId: id };
    }),
  closeTab: (id) => {
    const tab = get().tabs.find((candidate) => candidate.id === id);
    set((state) => {
      const tabs = state.tabs.filter((candidate) => candidate.id !== id);
      const activeTabId = state.activeTabId === id ? (tabs.at(-1)?.id ?? null) : state.activeTabId;
      return { tabs, activeTabId };
    });
    return tab;
  },
  setActive: (id) => set({ activeTabId: id }),
  markDirty: (uri) => set((state) => ({ tabs: state.tabs.map((tab) => (tab.uri === uri ? { ...tab, dirty: true } : tab)) })),
  markSaved: (uri, nextPath) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.uri === uri ? { ...tab, dirty: false, path: nextPath ?? tab.path, title: nextPath ? titleFromPath(nextPath) : tab.title } : tab,
      ),
    })),
}));

export function activeTab(): EditorTab | undefined {
  const { tabs, activeTabId } = useEditorStore.getState();
  return tabs.find((tab) => tab.id === activeTabId);
}
