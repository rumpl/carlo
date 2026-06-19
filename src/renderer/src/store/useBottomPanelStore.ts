import { create } from 'zustand';

export type BottomPanelId = 'problems' | 'search' | 'git';

interface BottomPanelState {
  activePanel: BottomPanelId | null;
  openPanel: (panel: BottomPanelId) => void;
  closePanel: () => void;
  togglePanel: (panel: BottomPanelId) => void;
}

export const useBottomPanelStore = create<BottomPanelState>((set) => ({
  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
  togglePanel: (panel) =>
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
}));
