import { defaultUserConfig, type CarloUserConfig } from '@shared/app-config';
import { create } from 'zustand';
import { applySettings } from '../settings/applySettings';

interface SettingsState {
  config: CarloUserConfig;
  configPath?: string;
  isLoading: boolean;
  isOpen: boolean;
  closeSettings: () => void;
  loadSettings: () => Promise<void>;
  openSettings: () => void;
  saveSettings: (config: CarloUserConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  config: defaultUserConfig(),
  isLoading: false,
  isOpen: false,
  closeSettings: () => set({ isOpen: false }),
  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const [config, { path }] = await Promise.all([
        window.api.config.user(),
        window.api.config.userPath(),
      ]);
      applySettings(config);
      set({ config, configPath: path });
    } finally {
      set({ isLoading: false });
    }
  },
  openSettings: () => set({ isOpen: true }),
  saveSettings: async (config) => {
    const saved = await window.api.config.saveUser(config);
    applySettings(saved);
    set({ config: saved });
  },
}));
