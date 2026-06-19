import { create } from 'zustand';

interface QuickOpenState {
  open: boolean;
  query: string;
  openQuickOpen: () => void;
  closeQuickOpen: () => void;
  setQuery: (query: string) => void;
}

export const useQuickOpenStore = create<QuickOpenState>((set) => ({
  open: false,
  query: '',
  openQuickOpen: () => set({ open: true, query: '' }),
  closeQuickOpen: () => set({ open: false, query: '' }),
  setQuery: (query) => set({ query }),
}));
