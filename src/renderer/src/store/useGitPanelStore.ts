import { create } from 'zustand';
import { useBottomPanelStore } from './useBottomPanelStore';

interface GitPanelState {
  isOpen: boolean;
  openGitPanel: () => void;
  closeGitPanel: () => void;
  toggleGitPanel: () => void;
}

export const useGitPanelStore = create<GitPanelState>((set) => ({
  isOpen: false,
  openGitPanel: () => {
    useBottomPanelStore.getState().openPanel('git');
    set({ isOpen: true });
  },
  closeGitPanel: () => {
    useBottomPanelStore.getState().closePanel();
    set({ isOpen: false });
  },
  toggleGitPanel: () => {
    const willOpen = useBottomPanelStore.getState().activePanel !== 'git';
    useBottomPanelStore.getState().togglePanel('git');
    set({ isOpen: willOpen });
  },
}));
