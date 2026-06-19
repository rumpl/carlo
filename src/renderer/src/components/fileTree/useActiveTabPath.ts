import { useEditorStore } from '../../store/useEditorStore';

export function useActiveTabPath(): string | undefined {
  return useEditorStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.path);
}
