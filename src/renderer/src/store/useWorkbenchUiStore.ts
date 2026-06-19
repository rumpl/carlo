import { create } from 'zustand';

interface WorkbenchUiState {
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  showSidebar: () => void;
  hideSidebar: () => void;
}

export const useWorkbenchUiStore = create<WorkbenchUiState>((set) => ({
  sidebarVisible: true,
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  showSidebar: () => set({ sidebarVisible: true }),
  hideSidebar: () => set({ sidebarVisible: false }),
}));
