import type { EditorTab } from '../store/useEditorStore';

interface Props { tab: EditorTab; active: boolean; onSelect: () => void; onClose: () => void; }
export function Tab({ tab, active, onSelect, onClose }: Props) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onSelect} title={tab.path}>
    <span>{tab.title}{tab.dirty ? ' •' : ''}</span>
    <span className="tab-close" onClick={(event) => { event.stopPropagation(); onClose(); }}>×</span>
  </button>;
}
