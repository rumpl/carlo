import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Breadcrumbs } from './Breadcrumbs';
import { titleFromState } from './appTitleUtils';

export function AppTitleBar() {
  const activeGroupId = useEditorStore((state) => state.activeGroupId);
  const workspaceName = useEditorStore((state) => state.workspace?.name);
  const activeTab = useEditorStore((state) => {
    const activeTabId = state.groups.find((group) => group.id === state.activeGroupId)?.activeTabId;
    return state.tabs.find((tab) => tab.id === activeTabId);
  });
  useEffect(() => {
    document.title = titleFromState();
  }, [activeTab?.title, activeTab?.dirty, workspaceName, activeGroupId]);

  return (
    <header className="app-titlebar">
      <div className="app-titlebar-brand">Carlo</div>
      <div className="app-titlebar-center">
        {activeTab ? <Breadcrumbs groupId={activeGroupId} compact /> : <span>{workspaceName ?? 'No folder open'}</span>}
      </div>
    </header>
  );
}
