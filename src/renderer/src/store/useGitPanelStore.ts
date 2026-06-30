import { create } from 'zustand';
import { useBottomPanelStore } from './useBottomPanelStore';

interface GitPanelState {
  openGitPanel: () => void;
  closeGitPanel: () => void;
  toggleGitPanel: () => void;
}

export const useGitPanelStore = create<GitPanelState>(() => ({
  openGitPanel: () => {
    useBottomPanelStore.getState().openPanel('git');
  },
  closeGitPanel: () => {
    useBottomPanelStore.getState().closePanel();
  },
  toggleGitPanel: () => {
    useBottomPanelStore.getState().togglePanel('git');
  },
}));
