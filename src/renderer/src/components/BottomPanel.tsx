import { lazy, Suspense } from 'react';
import { problemCounts, useProblemsStore } from '../store/useProblemsStore';
import { useBottomPanelStore } from '../store/useBottomPanelStore';
import { PanelTabStrip } from './PanelTabStrip';

const ProblemsPanel = lazy(() => import('./ProblemsPanel').then((module) => ({ default: module.ProblemsPanel })));
const SearchPanel = lazy(() => import('./SearchPanel').then((module) => ({ default: module.SearchPanel })));
const GitPanel = lazy(() => import('./GitPanel').then((module) => ({ default: module.GitPanel })));

export function BottomPanel() {
  const activePanel = useBottomPanelStore((state) => state.activePanel);
  const openPanel = useBottomPanelStore((state) => state.openPanel);
  const closePanel = useBottomPanelStore((state) => state.closePanel);
  const problems = useProblemsStore((state) => state.problems);
  const counts = problemCounts(problems);

  if (!activePanel) return null;

  return (
    <section className="bottom-panel" aria-label="Panel">
      <PanelTabStrip
        activePanel={activePanel}
        errorCount={counts.errors}
        warningCount={counts.warnings}
        onOpen={openPanel}
        onClose={closePanel}
      />
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
