import type { EditorTab } from '../store/useEditorStore';

interface Props {
  tab: EditorTab;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}
export function Tab({ tab, active, onSelect, onClose }: Props) {
  return (
    <button
      className={`tab ${active ? 'active' : ''}`}
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
      <span
        className="tab-close"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ×
      </span>
    </button>
  );
}
