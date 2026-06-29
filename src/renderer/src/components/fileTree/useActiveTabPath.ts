import { useEditorStore } from '../../store/useEditorStore';

export function useActiveTabPath(): string | undefined {
  return useEditorStore((state) => {
    const activeTabId = state.groups.find((g) => g.id === state.activeGroupId)?.activeTabId;
    return state.tabs.find((tab) => tab.id === activeTabId)?.path;
  });
}
