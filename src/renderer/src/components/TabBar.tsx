import { type MouseEvent, useEffect, useState } from 'react';
import type { EditorTab } from '../store/useEditorStore';
import { useEditorStore } from '../store/useEditorStore';
import { isMarkdownTab } from '../markdown/previewTabs';
import { runCommand } from '../commands/registry';
import { Tab } from './Tab';
import { relativePath } from '../commands/builtin/pathUtils';

interface TabContextMenu {
  x: number;
  y: number;
  tab: EditorTab;
}

interface Props {
  groupId: string;
}

export function TabBar({ groupId }: Props) {
  const { tabs, groups, activeGroupId, setActive, closeGroup, workspace } = useEditorStore();
  const [contextMenu, setContextMenu] = useState<TabContextMenu | undefined>(undefined);
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

  const contextTabIndex = contextMenu
    ? groupTabs.findIndex((tab) => tab.id === contextMenu.tab.id)
    : -1;
  const tabsToRight = contextTabIndex >= 0 ? groupTabs.slice(contextTabIndex + 1) : [];
  const otherTabs = contextMenu ? groupTabs.filter((tab) => tab.id !== contextMenu.tab.id) : [];
  const savedTabs = groupTabs.filter((tab) => !tab.dirty);

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
        <div
          className="tab-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {isMarkdownTab(contextMenu.tab) ? (
            <>
              <button type="button" onClick={() => runContextAction(() => runCommand('markdown.showPreviewToSide'))}>
                Open Markdown Preview to Side
              </button>
              <div className="tab-context-separator" />
            </>
          ) : null}
          <button type="button" onClick={() => runContextAction(() => closeTabsWithPrompt([contextMenu.tab]))}>
            Close
          </button>
          <button
            type="button"
            disabled={otherTabs.length === 0}
            onClick={() => runContextAction(() => closeTabsWithPrompt(otherTabs))}
          >
            Close Others
          </button>
          <button
            type="button"
            disabled={tabsToRight.length === 0}
            onClick={() => runContextAction(() => closeTabsWithPrompt(tabsToRight))}
          >
            Close Tabs to the Right
          </button>
          <button
            type="button"
            disabled={savedTabs.length === 0}
            onClick={() => runContextAction(() => closeTabsWithPrompt(savedTabs))}
          >
            Close Saved
          </button>
          <div className="tab-context-separator" />
          <button
            type="button"
            disabled={contextMenu.tab.uri.startsWith('untitled:')}
            onClick={() => runContextAction(() => navigator.clipboard.writeText(contextMenu.tab.path))}
          >
            Copy Path
          </button>
          <button
            type="button"
            disabled={contextMenu.tab.uri.startsWith('untitled:')}
            onClick={() => runContextAction(() => navigator.clipboard.writeText(relativePath(contextMenu.tab.path, workspace?.rootPath)))}
          >
            Copy Relative Path
          </button>
          <button
            type="button"
            disabled={contextMenu.tab.uri.startsWith('untitled:')}
            onClick={() => runContextAction(async () => {
              await window.api.file.revealInFolder(contextMenu.tab.path);
            })}
          >
            Reveal in Finder
          </button>
          <button type="button" onClick={() => runContextAction(() => setActive(contextMenu.tab.id, groupId))}>
            Reveal in File Tree
          </button>
        </div>
      ) : null}
    </div>
  );
}
