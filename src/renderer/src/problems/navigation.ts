import { openFileByPath } from '../editor/openFileByPath';
import { type ProblemItem, useProblemsStore } from '../store/useProblemsStore';

export async function openProblem(problem: ProblemItem): Promise<void> {
  const [{ getEditor, revealPosition, setPendingReveal }, { useEditorStore }] = await Promise.all([
    import('../editor/editorRegistry'),
    import('../store/useEditorStore'),
  ]);
  const position = { lineNumber: problem.startLineNumber, column: problem.startColumn };
  setPendingReveal(useEditorStore.getState().activeGroupId, problem.uri, position);
  await openFileByPath(problem.path, problem.uri);
  requestAnimationFrame(() => {
    const editor = getEditor();
    if (editor?.getModel()?.uri.toString() === problem.uri) {
      revealPosition(editor, position);
    }
  });
}

export async function navigateProblem(direction: 'next' | 'previous'): Promise<void> {
  const problems = useProblemsStore.getState().problems;
  if (problems.length === 0) return;
  const { getEditor } = await import('../editor/editorRegistry');
  const editor = getEditor();
  const uri = editor?.getModel()?.uri.toString();
  const position = editor?.getPosition();
  let nextIndex = direction === 'next' ? 0 : problems.length - 1;
  if (uri && position) {
    const currentIndex = problems.findIndex(
      (problem) =>
        problem.uri === uri &&
        problem.startLineNumber === position.lineNumber &&
        problem.startColumn === position.column,
    );
    if (currentIndex !== -1) {
      nextIndex =
        direction === 'next'
          ? (currentIndex + 1) % problems.length
          : (currentIndex - 1 + problems.length) % problems.length;
    } else {
      const firstAfterIndex = problems.findIndex(
        (problem) =>
          problem.uri === uri &&
          (problem.startLineNumber > position.lineNumber ||
            (problem.startLineNumber === position.lineNumber && problem.startColumn > position.column)),
      );
      if (firstAfterIndex !== -1) {
        nextIndex =
          direction === 'next'
            ? firstAfterIndex
            : (firstAfterIndex - 1 + problems.length) % problems.length;
      }
    }
  }
  await openProblem(problems[nextIndex]!);
}
