import { lazy, Suspense } from 'react';
import { problemCounts, useProblemsStore } from '../store/useProblemsStore';
import { useBottomPanelStore, type BottomPanelId } from '../store/useBottomPanelStore';

const ProblemsPanel = lazy(() => import('./ProblemsPanel').then((module) => ({ default: module.ProblemsPanel })));
const SearchPanel = lazy(() => import('./SearchPanel').then((module) => ({ default: module.SearchPanel })));
const GitPanel = lazy(() => import('./GitPanel').then((module) => ({ default: module.GitPanel })));

const panelLabels: Record<BottomPanelId, string> = {
  problems: 'Problems',
  search: 'Search',
  git: 'Source Control',
};

export function BottomPanel() {
  const activePanel = useBottomPanelStore((state) => state.activePanel);
  const openPanel = useBottomPanelStore((state) => state.openPanel);
  const closePanel = useBottomPanelStore((state) => state.closePanel);
  const problems = useProblemsStore((state) => state.problems);
  const counts = problemCounts(problems);

  if (!activePanel) return null;

  return (
    <section className="bottom-panel" aria-label="Panel">
      <div className="bottom-panel-tabs" role="tablist" aria-label="Panel tabs">
        {(Object.keys(panelLabels) as BottomPanelId[]).map((panel) => (
          <button
            key={panel}
            className={`bottom-panel-tab ${activePanel === panel ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activePanel === panel}
            onClick={() => openPanel(panel)}
          >
            {panelLabels[panel]}
            {panel === 'problems' ? (
              <span className="bottom-panel-badge">{counts.errors} / {counts.warnings}</span>
            ) : null}
          </button>
        ))}
        <span className="bottom-panel-spacer" />
        <button className="bottom-panel-close" type="button" onClick={closePanel} title="Close Panel">
          ×
        </button>
      </div>
      <div className="bottom-panel-content">
        <Suspense fallback={null}>
          {activePanel === 'problems' ? <ProblemsPanel /> : null}
          {activePanel === 'search' ? <SearchPanel /> : null}
          {activePanel === 'git' ? <GitPanel /> : null}
        </Suspense>
      </div>
    </section>
  );
}
