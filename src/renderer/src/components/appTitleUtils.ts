import { useEditorStore } from '../store/useEditorStore';

export function titleFromState(): string {
  const { activeGroupId, groups, tabs, workspace } = useEditorStore.getState();
  const activeTabId = groups.find((group) => group.id === activeGroupId)?.activeTabId;
  const tab = tabs.find((candidate) => candidate.id === activeTabId);
  if (tab) {
    const dirty = tab.dirty ? '● ' : '';
    return workspace ? `${dirty}${tab.title} — ${workspace.name} — Carlo` : `${dirty}${tab.title} — Carlo`;
  }
  return workspace ? `${workspace.name} — Carlo` : 'Carlo';
}
