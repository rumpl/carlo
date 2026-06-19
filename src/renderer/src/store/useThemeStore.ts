import { CARLO_DEFAULT_THEME, CARLO_THEMES, type CarloThemeId, type CarloThemeKind } from '@shared/app-config';
import { create } from 'zustand';
import { ensureVscodeServices } from '../vscode/servicesReady';

export const THEMES = CARLO_THEMES;
export type ThemeId = CarloThemeId;
type ThemeKind = CarloThemeKind;

interface ThemeState {
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  toggleTheme: () => void;
}

function themeKind(themeId: ThemeId): ThemeKind {
  return THEMES.find((theme) => theme.id === themeId)?.kind ?? 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: CARLO_DEFAULT_THEME,
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
