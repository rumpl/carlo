import { useSyncExternalStore } from 'react';
import { disposeModel } from '../editor/models';
import {
  canNavigateBack,
  canNavigateForward,
  navigateBack,
  navigateForward,
  subscribeNavigationHistory,
} from '../editor/navigationHistory';
import { useEditorStore } from '../store/useEditorStore';
import { Tab } from './Tab';

interface Props {
  groupId: string;
}

export function TabBar({ groupId }: Props) {
  useSyncExternalStore(
    subscribeNavigationHistory,
    () => `${canNavigateBack()}:${canNavigateForward()}`,
  );
  const { tabs, groups, activeGroupId, setActive, closeTab, closeGroup } = useEditorStore();
  const group = groups.find((candidate) => candidate.id === groupId);
  const groupTabs = group
    ? group.tabIds.flatMap((id) => tabs.find((tab) => tab.id === id) ?? [])
    : [];
  return (
    <div className={`tab-bar ${groupId === activeGroupId ? 'active-group' : ''}`}>
      <button
        className="nav-button"
        title="Go Back"
        disabled={!canNavigateBack()}
        onClick={navigateBack}
      >
        ←
      </button>
      <button
        className="nav-button"
        title="Go Forward"
        disabled={!canNavigateForward()}
        onClick={navigateForward}
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
              if (tab.dirty && !confirm(`Discard unsaved changes to ${tab.title}?`)) return;
              const closed = closeTab(tab.id);
              if (closed) disposeModel(closed.uri);
            }}
          />
        ))}
      </div>
      <div className="tab-bar-spacer" aria-hidden="true" />
      {groups.length > 1 ? (
        <button className="group-close" title="Close split" onClick={() => closeGroup(groupId)}>
          ×
        </button>
      ) : null}
    </div>
  );
}
