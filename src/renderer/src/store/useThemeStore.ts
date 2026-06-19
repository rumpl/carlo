import { create } from 'zustand';
import { ensureVscodeServices } from '../vscode/servicesReady';

export const THEMES = [
  { id: 'Nord', label: 'Nord', kind: 'dark' },
  { id: 'Default Dark Modern', label: 'Default Dark Modern', kind: 'dark' },
  { id: 'Default Dark+', label: 'Default Dark+', kind: 'dark' },
  { id: 'Visual Studio Dark', label: 'Visual Studio Dark', kind: 'dark' },
  { id: 'Default Light Modern', label: 'Default Light Modern', kind: 'light' },
  { id: 'Default Light+', label: 'Default Light+', kind: 'light' },
  { id: 'Visual Studio Light', label: 'Visual Studio Light', kind: 'light' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
type ThemeKind = (typeof THEMES)[number]['kind'];

interface ThemeState {
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  toggleTheme: () => void;
}

function themeKind(themeId: ThemeId): ThemeKind {
  return THEMES.find((theme) => theme.id === themeId)?.kind ?? 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: 'Nord',
  setTheme: (themeId) => {
    document.documentElement.dataset.theme = themeKind(themeId);
    document.documentElement.dataset.themeId = themeId;
    set({ themeId });
    void ensureVscodeServices()
      .then(() => import('@codingame/monaco-vscode-editor-api'))
      .then((monaco) => monaco.editor.setTheme(themeId))
      .catch(console.error);
  },
  toggleTheme: () =>
    get().setTheme(themeKind(get().themeId) === 'dark' ? 'Default Light Modern' : 'Nord'),
}));
