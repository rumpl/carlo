import type { EditorTab } from '../store/useEditorStore';
import { isMarkdownTab } from '../markdown/previewTabs';
import { runCommand } from '../commands/registry';
import { relativePath } from '../commands/builtin/pathUtils';

export interface TabContextMenuState {
  x: number;
  y: number;
  tab: EditorTab;
}

interface Props {
  contextMenu: TabContextMenuState;
  groupTabs: EditorTab[];
  groupId: string;
  workspace: { rootPath?: string } | null | undefined;
  onClose: () => void;
  onRunAction: (action: () => void | Promise<void>) => void;
  onSetActive: (tabId: string, groupId: string) => void;
  onCloseTabsWithPrompt: (tabs: EditorTab[]) => Promise<void>;
}

export function TabContextMenu({
  contextMenu,
  groupTabs,
  groupId,
  workspace,
  onClose: _onClose,
  onRunAction,
  onSetActive,
  onCloseTabsWithPrompt,
}: Props) {
  const contextTabIndex = groupTabs.findIndex((tab) => tab.id === contextMenu.tab.id);
  const tabsToRight = contextTabIndex >= 0 ? groupTabs.slice(contextTabIndex + 1) : [];
  const otherTabs = groupTabs.filter((tab) => tab.id !== contextMenu.tab.id);
  const savedTabs = groupTabs.filter((tab) => !tab.dirty);

  return (
    <div
      className="tab-context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {isMarkdownTab(contextMenu.tab) ? (
        <>
          <button type="button" onClick={() => onRunAction(() => runCommand('markdown.showPreviewToSide'))}>
            Open Markdown Preview to Side
          </button>
          <div className="tab-context-separator" />
        </>
      ) : null}
      <button type="button" onClick={() => onRunAction(() => onCloseTabsWithPrompt([contextMenu.tab]))}>
        Close
      </button>
      <button
        type="button"
        disabled={otherTabs.length === 0}
        onClick={() => onRunAction(() => onCloseTabsWithPrompt(otherTabs))}
      >
        Close Others
      </button>
      <button
        type="button"
        disabled={tabsToRight.length === 0}
        onClick={() => onRunAction(() => onCloseTabsWithPrompt(tabsToRight))}
      >
        Close Tabs to the Right
      </button>
      <button
        type="button"
        disabled={savedTabs.length === 0}
        onClick={() => onRunAction(() => onCloseTabsWithPrompt(savedTabs))}
      >
        Close Saved
      </button>
      <div className="tab-context-separator" />
      <button
        type="button"
        disabled={contextMenu.tab.uri.startsWith('untitled:')}
        onClick={() => onRunAction(() => navigator.clipboard.writeText(contextMenu.tab.path))}
      >
        Copy Path
      </button>
      <button
        type="button"
        disabled={contextMenu.tab.uri.startsWith('untitled:')}
        onClick={() => onRunAction(() => navigator.clipboard.writeText(relativePath(contextMenu.tab.path, workspace?.rootPath)))}
      >
        Copy Relative Path
      </button>
      <button
        type="button"
        disabled={contextMenu.tab.uri.startsWith('untitled:')}
        onClick={() => onRunAction(async () => {
          await window.api.file.revealInFolder(contextMenu.tab.path);
        })}
      >
        Reveal in Finder
      </button>
      <button type="button" onClick={() => onRunAction(() => onSetActive(contextMenu.tab.id, groupId))}>
        Reveal in File Tree
      </button>
    </div>
  );
}
