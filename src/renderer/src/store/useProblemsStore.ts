import { create } from 'zustand';
import { useBottomPanelStore } from './useBottomPanelStore';

export type ProblemSeverity = 1 | 2 | 3 | 4;

export interface ProblemItem {
  id: string;
  uri: string;
  path: string;
  owner: string;
  severity: ProblemSeverity;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface ProblemsState {
  problems: ProblemItem[];
  toggleProblems: () => void;
  openProblems: () => void;
  closeProblems: () => void;
  setProblems: (problems: ProblemItem[]) => void;
}

export const useProblemsStore = create<ProblemsState>((set) => ({
  problems: [],
  toggleProblems: () => {
    useBottomPanelStore.getState().togglePanel('problems');
  },
  openProblems: () => {
    useBottomPanelStore.getState().openPanel('problems');
  },
  closeProblems: () => {
    useBottomPanelStore.getState().closePanel();
  },
  setProblems: (problems) => set({ problems }),
}));

export function problemCounts(problems: ProblemItem[]): { errors: number; warnings: number; infos: number; hints: number } {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  let hints = 0;
  for (const problem of problems) {
    if (problem.severity === 1) errors += 1;
    else if (problem.severity === 2) warnings += 1;
    else if (problem.severity === 3) infos += 1;
    else hints += 1;
  }
  return { errors, warnings, infos, hints };
}
