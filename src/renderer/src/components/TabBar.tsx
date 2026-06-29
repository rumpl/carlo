import { type MouseEvent, useEffect, useState } from 'react';
import type { EditorTab } from '../store/useEditorStore';
import { useEditorStore } from '../store/useEditorStore';
import { Tab } from './Tab';
import { TabContextMenu, type TabContextMenuState } from './TabContextMenu';

interface Props {
  groupId: string;
}

export function TabBar({ groupId }: Props) {
  const { tabs, groups, activeGroupId, setActive, closeGroup, workspace } = useEditorStore();
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | undefined>(undefined);
  const group = groups.find((candidate) => candidate.id === groupId);
  const groupTabs = group
    ? group.tabIds.flatMap((id) => tabs.find((tab) => tab.id === id) ?? [])
    : [];

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(undefined);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [contextMenu]);

  async function closeTabsWithPrompt(tabsToClose: EditorTab[]): Promise<void> {
    const { closeTabWithPrompt } = await import('../editor/saveActions');
    for (const tab of tabsToClose) {
      const currentTab = useEditorStore.getState().tabs.find((candidate) => candidate.id === tab.id);
      if (!currentTab) continue;
      const closed = await closeTabWithPrompt(currentTab);
      if (!closed) break;
    }
  }

  function openContextMenu(event: MouseEvent, tab: EditorTab): void {
    event.preventDefault();
    event.stopPropagation();
    setActive(tab.id, groupId);
    setContextMenu({ x: event.clientX, y: event.clientY, tab });
  }

  function runContextAction(action: () => void | Promise<void>): void {
    setContextMenu(undefined);
    void Promise.resolve(action()).catch(console.error);
  }

  return (
    <div className={`tab-bar ${groupId === activeGroupId ? 'active-group' : ''}`}>
      <button
        className="nav-button"
        title="Go Back"
        onClick={() => void import('../editor/navigationHistory').then(({ navigateBack }) => navigateBack())}
      >
        ←
      </button>
      <button
        className="nav-button"
        title="Go Forward"
        onClick={() => void import('../editor/navigationHistory').then(({ navigateForward }) => navigateForward())}
      >
        →
      </button>
      <div
        className="tab-strip"
        onWheel={(event) => {
          const tabStrip = event.currentTarget;
          if (tabStrip.scrollWidth <= tabStrip.clientWidth) return;
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          tabStrip.scrollLeft += event.deltaY;
          event.preventDefault();
        }}
      >
        {groupTabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            active={tab.id === group?.activeTabId}
            onSelect={() => setActive(tab.id, groupId)}
            onClose={() => {
              void import('../editor/saveActions')
                .then(({ closeTabWithPrompt }) => closeTabWithPrompt(tab))
                .catch(console.error);
            }}
            onContextMenu={(event) => openContextMenu(event, tab)}
          />
        ))}
      </div>
      <div className="tab-bar-spacer" aria-hidden="true" />
      {groups.length > 1 ? (
        <button className="group-close" title="Close split" onClick={() => closeGroup(groupId)}>
          ×
        </button>
      ) : null}
      {contextMenu ? (
        <TabContextMenu
          contextMenu={contextMenu}
          groupTabs={groupTabs}
          groupId={groupId}
          workspace={workspace}
          onClose={() => setContextMenu(undefined)}
          onRunAction={runContextAction}
          onSetActive={setActive}
          onCloseTabsWithPrompt={closeTabsWithPrompt}
        />
      ) : null}
    </div>
  );
}
