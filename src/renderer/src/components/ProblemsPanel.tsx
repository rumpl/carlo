import { useMemo } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { problemCounts, useProblemsStore } from '../store/useProblemsStore';
import { ProblemFileSection } from './ProblemFileSection';

export function ProblemsPanel() {
  const workspace = useEditorStore((state) => state.workspace);
  const problems = useProblemsStore((state) => state.problems);
  const counts = useMemo(() => problemCounts(problems), [problems]);
  const groupedProblems = useMemo(() => {
    const groups = new Map<string, typeof problems>();
    for (const problem of problems) {
      const group = groups.get(problem.path) ?? [];
      group.push(problem);
      groups.set(problem.path, group);
    }
    return [...groups.entries()];
  }, [problems]);

  return (
    <section className="problems-panel" aria-label="Problems">
      <header className="problems-header">
        <div className="problems-title">Problems</div>
        <div className="problems-summary" title={`${problems.length} problem${problems.length === 1 ? '' : 's'}`}>
          <span className="problem-count problem-severity-error">{counts.errors} errors</span>
          <span className="problem-count problem-severity-warning">{counts.warnings} warnings</span>
          <span className="problem-count problem-severity-info">{counts.infos + counts.hints} info</span>
        </div>
      </header>
      <div className="problems-body">
        {problems.length === 0 ? (
          <div className="problems-empty">No problems detected.</div>
        ) : (
          groupedProblems.map(([path, fileProblems]) => (
            <ProblemFileSection
              key={path}
              path={path}
              problems={fileProblems}
              rootPath={workspace?.rootPath}
            />
          ))
        )}
      </div>
    </section>
  );
}
