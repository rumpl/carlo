import { create } from 'zustand';
import type { WorkspaceSearchMatch } from '@shared/file-types';
import { useBottomPanelStore } from './useBottomPanelStore';

interface SearchState {
  isOpen: boolean;
  query: string;
  results: WorkspaceSearchMatch[];
  loading: boolean;
  truncated: boolean;
  error: string | null;
  hasSearched: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setResults: (results: WorkspaceSearchMatch[], truncated: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: '',
  results: [],
  loading: false,
  truncated: false,
  error: null,
  hasSearched: false,
  openSearch: () => {
    useBottomPanelStore.getState().openPanel('search');
    set({ isOpen: true });
  },
  closeSearch: () => {
    useBottomPanelStore.getState().closePanel();
    set({ isOpen: false });
  },
  toggleSearch: () => {
    const willOpen = useBottomPanelStore.getState().activePanel !== 'search';
    useBottomPanelStore.getState().togglePanel('search');
    set({ isOpen: willOpen });
  },
  setQuery: (query) => set({ query, hasSearched: false }),
  setLoading: (loading) => set({ loading }),
  setResults: (results, truncated) => set({ results, truncated, error: null, hasSearched: true }),
  setError: (error) => set({ error }),
}));
