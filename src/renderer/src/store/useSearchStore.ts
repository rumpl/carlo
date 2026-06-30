import { create } from 'zustand';
import type { WorkspaceSearchMatch } from '@shared/file-types';
import { useBottomPanelStore } from './useBottomPanelStore';

interface SearchState {
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
  query: '',
  results: [],
  loading: false,
  truncated: false,
  error: null,
  hasSearched: false,
  openSearch: () => {
    useBottomPanelStore.getState().openPanel('search');
  },
  closeSearch: () => {
    useBottomPanelStore.getState().closePanel();
  },
  toggleSearch: () => {
    useBottomPanelStore.getState().togglePanel('search');
  },
  setQuery: (query) => set({ query, hasSearched: false }),
  setLoading: (loading) => set({ loading }),
  setResults: (results, truncated) => set({ results, truncated, error: null, hasSearched: true }),
  setError: (error) => set({ error }),
}));
