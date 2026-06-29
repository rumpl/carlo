import { useEditorStore } from '../store/useEditorStore';
import { problemCounts, useProblemsStore } from '../store/useProblemsStore';
import { LspStatusIndicator } from './LspStatusIndicator';

export function StatusBar() {
  const tab = useEditorStore((state) => {
    const activeTabId = state.groups.find((group) => group.id === state.activeGroupId)?.activeTabId;
    return state.tabs.find((tab) => tab.id === activeTabId);
  });
  const problems = useProblemsStore((state) => state.problems);
  const toggleProblems = useProblemsStore((state) => state.toggleProblems);
  const counts = problemCounts(problems);

  return (
    <footer className="status-bar">
      <button
        className="status-item status-button"
        type="button"
        onClick={toggleProblems}
        title="Toggle Problems"
      >
        ⛔ {counts.errors}  ⚠ {counts.warnings}
      </button>
      <span className="status-spacer" />
      <LspStatusIndicator languageId={tab?.languageId} />
    </footer>
  );
}
