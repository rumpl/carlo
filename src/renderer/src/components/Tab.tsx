import type { MouseEvent } from 'react';
import type { EditorTab } from '../store/useEditorStore';

interface Props {
  tab: EditorTab;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (event: MouseEvent) => void;
}
export function Tab({ tab, active, onSelect, onClose, onContextMenu }: Props) {
  return (
    <div
      className={`tab ${active ? 'active' : ''}`}
      onContextMenu={onContextMenu}
    >
      <button
        type="button"
        className="tab-select"
        onClick={onSelect}
        onAuxClick={(event) => {
          if (event.button !== 1) return;
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        title={tab.path}
      >
        <span className="tab-title">
          {tab.title}
          {tab.dirty ? ' •' : ''}
        </span>
      </button>
      <button
        type="button"
        className="tab-close"
        aria-label={`Close ${tab.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </div>
  );
}
