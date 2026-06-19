import { create } from 'zustand';

interface CommandState {
  paletteOpen: boolean;
  query: string;
  openPalette: () => void;
  closePalette: () => void;
  setQuery: (query: string) => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  paletteOpen: false,
  query: '',
  openPalette: () => set({ paletteOpen: true, query: '' }),
  closePalette: () => set({ paletteOpen: false, query: '' }),
  setQuery: (query) => set({ query }),
}));
