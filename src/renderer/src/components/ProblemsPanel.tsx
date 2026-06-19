import { useMemo } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { type ProblemItem, problemCounts, useProblemsStore } from '../store/useProblemsStore';
import { openProblem } from '../problems/navigation';

const severityLabel: Record<ProblemItem['severity'], string> = {
  1: 'Error',
  2: 'Warning',
  3: 'Info',
  4: 'Hint',
};

const severityIcon: Record<ProblemItem['severity'], string> = {
  1: '⛔',
  2: '⚠',
  3: 'ⓘ',
  4: '◇',
};

function relativePath(path: string, rootPath: string | undefined): string {
  if (!rootPath) return path;
  const normalizedRoot = rootPath.replaceAll('\\', '/').replace(/\/+$/, '');
  const normalizedPath = path.replaceAll('\\', '/');
  return normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : path;
}

export function ProblemsPanel() {
  const workspace = useEditorStore((state) => state.workspace);
  const problems = useProblemsStore((state) => state.problems);
  const closeProblems = useProblemsStore((state) => state.closeProblems);
  const counts = useMemo(() => problemCounts(problems), [problems]);
  const groupedProblems = useMemo(() => {
    const groups = new Map<string, ProblemItem[]>();
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
        <button className="problems-close" type="button" onClick={closeProblems} title="Close Problems">
          ×
        </button>
      </header>
      <div className="problems-body">
        {problems.length === 0 ? (
          <div className="problems-empty">No problems detected.</div>
        ) : (
          groupedProblems.map(([path, fileProblems]) => (
            <section className="problem-file" key={path}>
              <div className="problem-file-title" title={path}>
                {relativePath(path, workspace?.rootPath)}
                <span>{fileProblems.length}</span>
              </div>
              <ul>
                {fileProblems.map((problem) => (
                  <li key={problem.id}>
                    <button
                      className={`problem-row problem-severity-${severityLabel[problem.severity].toLowerCase()}`}
                      type="button"
                      onClick={() => void openProblem(problem).catch(console.error)}
                      title={`${severityLabel[problem.severity]} at ${problem.startLineNumber}:${problem.startColumn}`}
                    >
                      <span className="problem-icon" aria-hidden="true">{severityIcon[problem.severity]}</span>
                      <span className="problem-message">{problem.message}</span>
                      <span className="problem-source">{problem.owner}</span>
                      <span className="problem-location">{problem.startLineNumber}:{problem.startColumn}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
