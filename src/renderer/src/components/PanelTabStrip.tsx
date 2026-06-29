import { type BottomPanelId } from '../store/useBottomPanelStore';

const panelLabels: Record<BottomPanelId, string> = {
  problems: 'Problems',
  search: 'Search',
  git: 'Source Control',
};

interface PanelTabStripProps {
  activePanel: BottomPanelId;
  errorCount: number;
  warningCount: number;
  onOpen: (panel: BottomPanelId) => void;
  onClose: () => void;
}

export function PanelTabStrip({ activePanel, errorCount, warningCount, onOpen, onClose }: PanelTabStripProps) {
  return (
    <div className="bottom-panel-tabs" role="tablist" aria-label="Panel tabs">
      {(Object.keys(panelLabels) as BottomPanelId[]).map((panel) => (
        <button
          key={panel}
          className={`bottom-panel-tab ${activePanel === panel ? 'active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activePanel === panel}
          onClick={() => onOpen(panel)}
        >
          {panelLabels[panel]}
          {panel === 'problems' ? (
            <span className="bottom-panel-badge">{errorCount} / {warningCount}</span>
          ) : null}
        </button>
      ))}
      <span className="bottom-panel-spacer" />
      <button className="bottom-panel-close" type="button" onClick={onClose} title="Close Panel">
        ×
      </button>
    </div>
  );
}
