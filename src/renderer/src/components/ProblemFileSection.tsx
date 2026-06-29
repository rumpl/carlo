import { type ProblemItem } from '../store/useProblemsStore';
import { openProblem } from '../problems/navigation';
import { relativePath } from '../commands/builtin/pathUtils';

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

interface ProblemFileSectionProps {
  path: string;
  problems: ProblemItem[];
  rootPath: string | undefined;
}

export function ProblemFileSection({ path, problems, rootPath }: ProblemFileSectionProps) {
  return (
    <section className="problem-file" key={path}>
      <div className="problem-file-title" title={path}>
        {relativePath(path, rootPath)}
        <span>{problems.length}</span>
      </div>
      <ul>
        {problems.map((problem) => (
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
  );
}
