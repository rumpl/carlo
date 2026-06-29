import { create } from 'zustand';
import { languageIdFromPath, type LanguageId } from '@shared/language-registry';
import { titleFromPath } from '../commands/builtin/pathUtils';

export interface EditorTab {
  id: string;
  uri: string;
  path: string;
  languageId: LanguageId;
  title: string;
  dirty: boolean;
}

export interface EditorGroup {
  id: string;
  tabIds: string[];
  activeTabId: string | null;
}

export interface RecentFile {
  uri: string;
  path: string;
  languageId: LanguageId;
  title: string;
}

interface WorkspaceState {
  rootUri: string;
  rootPath: string;
  name: string;
}

interface EditorState {
  tabs: EditorTab[];
  groups: EditorGroup[];
  activeGroupId: string;
  activeTabId: string | null;
  splitDirection: 'vertical' | 'horizontal';
  workspace: WorkspaceState | null;
  recentFiles: RecentFile[];
  setWorkspace: (workspace: WorkspaceState) => void;
  openFile: (tab: Omit<EditorTab, 'id' | 'dirty'>) => void;
  closeTab: (id: string) => EditorTab | undefined;
  setActive: (id: string, groupId?: string) => void;
  setActiveGroup: (id: string) => void;
  splitActive: (direction: 'vertical' | 'horizontal') => void;
  closeGroup: (id: string) => void;
  markDirty: (uri: string) => void;
  markSaved: (
    uri: string,
    savedAs?: { path: string; uri: string; languageId: LanguageId },
  ) => void;
  updateRenamedPath: (oldPath: string, newPath: string, newUri: string) => void;
}

const recentFilesStorageKey = 'carlo.recentFiles';
const maxRecentFiles = 30;
const initialGroupId = crypto.randomUUID();

function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(recentFilesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentFile[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((file) => file?.uri && file.path && file.languageId && file.title).slice(0, maxRecentFiles);
  } catch {
    return [];
  }
}

function storeRecentFiles(files: RecentFile[]): void {
  try {
    localStorage.setItem(recentFilesStorageKey, JSON.stringify(files.slice(0, maxRecentFiles)));
  } catch {
    // Ignore storage failures. Recent files are a convenience only.
  }
}

function updateRecentFiles(files: RecentFile[], file: RecentFile): RecentFile[] {
  const next = [file, ...files.filter((candidate) => candidate.uri !== file.uri)].slice(0, maxRecentFiles);
  storeRecentFiles(next);
  return next;
}

function currentActiveTabId(groups: EditorGroup[], activeGroupId: string): string | null {
  return groups.find((group) => group.id === activeGroupId)?.activeTabId ?? null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  groups: [{ id: initialGroupId, tabIds: [], activeTabId: null }],
  activeGroupId: initialGroupId,
  activeTabId: null,
  splitDirection: 'vertical',
  workspace: null,
  recentFiles: loadRecentFiles(),
  setWorkspace: (workspace) => set({ workspace }),
  openFile: (tab) =>
    set((state) => {
      const existing = state.tabs.find((candidate) => candidate.uri === tab.uri);
      const activeGroupId = state.activeGroupId;
      if (existing) {
        const groups = state.groups.map((group) =>
          group.id === activeGroupId && !group.tabIds.includes(existing.id)
            ? { ...group, tabIds: [...group.tabIds, existing.id], activeTabId: existing.id }
            : group.id === activeGroupId
              ? { ...group, activeTabId: existing.id }
              : group,
        );
        return {
          groups,
          activeTabId: existing.id,
          recentFiles: updateRecentFiles(state.recentFiles, existing),
        };
      }

      const id = crypto.randomUUID();
      const groups = state.groups.map((group) =>
        group.id === activeGroupId
          ? { ...group, tabIds: [...group.tabIds, id], activeTabId: id }
          : group,
      );
      const nextTab = { ...tab, id, dirty: false };
      return {
        tabs: [...state.tabs, nextTab],
        groups,
        activeTabId: id,
        recentFiles: updateRecentFiles(state.recentFiles, nextTab),
      };
    }),
  closeTab: (id) => {
    const tab = get().tabs.find((candidate) => candidate.id === id);
    set((state) => {
      let groups = state.groups.map((group) => {
        const tabIds = group.tabIds.filter((candidate) => candidate !== id);
        const activeTabId = group.activeTabId === id ? (tabIds.at(-1) ?? null) : group.activeTabId;
        return { ...group, tabIds, activeTabId };
      });
      groups = groups.length > 1 ? groups.filter((group) => group.tabIds.length > 0) : groups;
      const activeGroupId = groups.some((group) => group.id === state.activeGroupId)
        ? state.activeGroupId
        : (groups.at(-1)?.id ?? initialGroupId);
      return {
        tabs: state.tabs.filter((candidate) => candidate.id !== id),
        groups,
        activeGroupId,
        activeTabId: currentActiveTabId(groups, activeGroupId),
      };
    });
    return tab;
  },
  setActive: (id, groupId) =>
    set((state) => {
      const activeGroupId = groupId ?? state.groups.find((group) => group.tabIds.includes(id))?.id ?? state.activeGroupId;
      const groups = state.groups.map((group) =>
        group.id === activeGroupId ? { ...group, activeTabId: id } : group,
      );
      return { groups, activeGroupId, activeTabId: id };
    }),
  setActiveGroup: (id) =>
    set((state) => ({ activeGroupId: id, activeTabId: currentActiveTabId(state.groups, id) })),
  splitActive: (direction) =>
    set((state) => {
      const source = state.groups.find((group) => group.id === state.activeGroupId);
      const activeTabId = source?.activeTabId;
      if (!activeTabId) return { splitDirection: direction };
      const group: EditorGroup = { id: crypto.randomUUID(), tabIds: [activeTabId], activeTabId };
      return {
        groups: [...state.groups, group],
        activeGroupId: group.id,
        activeTabId,
        splitDirection: direction,
      };
    }),
  closeGroup: (id) =>
    set((state) => {
      if (state.groups.length <= 1) return {};
      const groups = state.groups.filter((group) => group.id !== id);
      const activeGroupId = state.activeGroupId === id ? groups[0]!.id : state.activeGroupId;
      return { groups, activeGroupId, activeTabId: currentActiveTabId(groups, activeGroupId) };
    }),
  markDirty: (uri) =>
    set((state) => ({ tabs: state.tabs.map((tab) => (tab.uri === uri ? { ...tab, dirty: true } : tab)) })),
  markSaved: (uri, savedAs) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.uri === uri
          ? {
              ...tab,
              uri: savedAs?.uri ?? tab.uri,
              languageId: savedAs?.languageId ?? tab.languageId,
              dirty: false,
              path: savedAs?.path ?? tab.path,
              title: savedAs ? titleFromPath(savedAs.path) : tab.title,
            }
          : tab,
      ),
    })),
  updateRenamedPath: (oldPath, newPath, newUri) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.path === oldPath) {
          return {
            ...tab,
            path: newPath,
            uri: newUri,
            languageId: languageIdFromPath(newPath),
            title: titleFromPath(newPath),
          };
        }
        const oldPrefix = `${oldPath}${oldPath.includes('\\') ? '\\' : '/'}`;
        if (!tab.path.startsWith(oldPrefix)) return tab;
        const path = `${newPath}${tab.path.slice(oldPath.length)}`;
        return {
          ...tab,
          path,
          uri: new URL(`file://${path}`).toString(),
          languageId: languageIdFromPath(path),
          title: titleFromPath(path),
        };
      }),
      recentFiles: state.recentFiles.map((file) => {
        if (file.path !== oldPath) return file;
        return { ...file, path: newPath, uri: newUri, languageId: languageIdFromPath(newPath), title: titleFromPath(newPath) };
      }),
    })),
}));

export function activeTab(): EditorTab | undefined {
  const { tabs, activeTabId } = useEditorStore.getState();
  return tabs.find((tab) => tab.id === activeTabId);
}

export function activeTabInGroup(groupId: string): EditorTab | undefined {
  const { tabs, groups } = useEditorStore.getState();
  const activeTabId = groups.find((group) => group.id === groupId)?.activeTabId;
  return tabs.find((tab) => tab.id === activeTabId);
}
