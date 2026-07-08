import { useActiveTab, useEditorStore } from '../store/useEditorStore';
import { problemCounts, useProblemsStore } from '../store/useProblemsStore';
import { useBottomPanelStore } from '../store/useBottomPanelStore';
import { LspStatusIndicator } from './LspStatusIndicator';

export function StatusBar() {
  const tab = useActiveTab();
  const workspaceRootUri = useEditorStore((state) => state.workspace?.rootUri);
  const problems = useProblemsStore((state) => state.problems);
  const toggleProblems = () => useBottomPanelStore.getState().togglePanel('problems');
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
      <LspStatusIndicator languageId={tab?.languageId} rootUri={workspaceRootUri} />
    </footer>
  );
}
