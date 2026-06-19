import { create } from 'zustand';
import * as monaco from '@codingame/monaco-vscode-editor-api';

export type ThemeId = 'Default Dark Modern' | 'Default Light Modern';

interface ThemeState {
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: 'Default Dark Modern',
  setTheme: (themeId) => {
    monaco.editor.setTheme(themeId);
    document.documentElement.dataset.theme = themeId.includes('Dark') ? 'dark' : 'light';
    set({ themeId });
  },
  toggleTheme: () => get().setTheme(get().themeId.includes('Dark') ? 'Default Light Modern' : 'Default Dark Modern'),
}));
