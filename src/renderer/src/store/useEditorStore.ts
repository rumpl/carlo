import { create } from 'zustand';
import { languageIdFromPath, type LanguageId } from '@shared/language-registry';
import { titleFromPath } from '../commands/builtin/pathUtils';
import { fileUriFromPath } from '../utils/uriUtils';

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
  closeTabInGroup: (id: string, groupId: string) => EditorTab | undefined;
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

function replaceRecentFile(files: RecentFile[], oldUri: string, file: RecentFile): RecentFile[] {
  const oldIndex = files.findIndex((candidate) => candidate.uri === oldUri);
  if (oldIndex === -1) return updateRecentFiles(files, file);

  const next = files
    .map((candidate, index) => (index === oldIndex ? file : candidate))
    .filter((candidate, index) => candidate.uri !== file.uri || index === oldIndex)
    .slice(0, maxRecentFiles);
  storeRecentFiles(next);
  return next;
}

function renamedPath(path: string, oldPath: string, newPath: string): string | undefined {
  if (path === oldPath) return newPath;
  const oldPrefix = `${oldPath}${oldPath.includes('\\') ? '\\' : '/'}`;
  if (!path.startsWith(oldPrefix)) return undefined;
  return `${newPath}${path.slice(oldPath.length)}`;
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
  closeTabInGroup: (id, groupId) => {
    let removedTab: EditorTab | undefined;
    set((state) => {
      const targetGroup = state.groups.find((group) => group.id === groupId);
      if (!targetGroup?.tabIds.includes(id)) return {};

      let groups = state.groups.map((group) => {
        if (group.id !== groupId) return group;
        const tabIds = group.tabIds.filter((candidate) => candidate !== id);
        const activeTabId = group.activeTabId === id ? (tabIds.at(-1) ?? null) : group.activeTabId;
        return { ...group, tabIds, activeTabId };
      });
      groups = groups.length > 1 ? groups.filter((group) => group.tabIds.length > 0) : groups;
      const tabIsStillOpen = groups.some((group) => group.tabIds.includes(id));
      if (!tabIsStillOpen) removedTab = state.tabs.find((candidate) => candidate.id === id);
      const activeGroupId = groups.some((group) => group.id === state.activeGroupId)
        ? state.activeGroupId
        : (groups.at(-1)?.id ?? initialGroupId);
      return {
        tabs: tabIsStillOpen ? state.tabs : state.tabs.filter((candidate) => candidate.id !== id),
        groups,
        activeGroupId,
        activeTabId: currentActiveTabId(groups, activeGroupId),
      };
    });
    return removedTab;
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
    set((state) => {
      const savedTab = state.tabs.find((tab) => tab.uri === uri);
      if (!savedTab) return {};

      const nextTab = {
        ...savedTab,
        uri: savedAs?.uri ?? savedTab.uri,
        languageId: savedAs?.languageId ?? savedTab.languageId,
        dirty: false,
        path: savedAs?.path ?? savedTab.path,
        title: savedAs ? titleFromPath(savedAs.path) : savedTab.title,
      };
      return {
        tabs: state.tabs.map((tab) => (tab.uri === uri ? nextTab : tab)),
        recentFiles: savedAs
          ? replaceRecentFile(state.recentFiles, uri, nextTab)
          : state.recentFiles,
      };
    }),
  updateRenamedPath: (oldPath, newPath, newUri) =>
    set((state) => {
      const renameFile = <T extends RecentFile>(file: T): T => {
        const path = renamedPath(file.path, oldPath, newPath);
        if (!path) return file;
        return {
          ...file,
          path,
          uri: file.path === oldPath ? newUri : fileUriFromPath(path),
          languageId: languageIdFromPath(path),
          title: titleFromPath(path),
        };
      };
      const seenRecentUris = new Set<string>();
      const recentFiles = state.recentFiles
        .map(renameFile)
        .filter((file) => {
          if (seenRecentUris.has(file.uri)) return false;
          seenRecentUris.add(file.uri);
          return true;
        })
        .slice(0, maxRecentFiles);
      storeRecentFiles(recentFiles);
      return {
        tabs: state.tabs.map(renameFile),
        recentFiles,
      };
    }),
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

/**
 * Reactive hook: returns the active tab in the currently active group.
 * Re-renders only when the active tab changes.
 */
export function useActiveTab(): EditorTab | undefined {
  return useEditorStore((state) => {
    const activeTabId = state.groups.find((group) => group.id === state.activeGroupId)?.activeTabId;
    return state.tabs.find((tab) => tab.id === activeTabId);
  });
}

/**
 * Reactive hook: returns the active tab in the specified group.
 * Re-renders only when the active tab of that group changes.
 */
export function useActiveTabInGroup(groupId: string): EditorTab | undefined {
  return useEditorStore((state) => {
    const activeTabId = state.groups.find((group) => group.id === groupId)?.activeTabId;
    return state.tabs.find((tab) => tab.id === activeTabId);
  });
}
