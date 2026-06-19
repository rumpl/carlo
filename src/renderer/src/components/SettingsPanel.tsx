import { useEffect, useState } from 'react';
import { defaultUserConfig, type CarloUserConfig } from '@shared/app-config';
import { useSettingsStore } from '../store/useSettingsStore';

export function SettingsPanel() {
  const config = useSettingsStore((state) => state.config);
  const configPath = useSettingsStore((state) => state.configPath);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isOpen = useSettingsStore((state) => state.isOpen);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const [mainViewFont, setMainViewFont] = useState(config.mainView.fontFamily);
  const [treeViewFont, setTreeViewFont] = useState(config.treeView.fontFamily);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMainViewFont(config.mainView.fontFamily);
    setTreeViewFont(config.treeView.fontFamily);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const draft: CarloUserConfig = {
    mainView: { fontFamily: mainViewFont },
    treeView: { fontFamily: treeViewFont },
  };

  async function save(): Promise<void> {
    setIsSaving(true);
    try {
      await saveSettings(draft);
      closeSettings();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  function resetDefaults(): void {
    const defaults = defaultUserConfig();
    setMainViewFont(defaults.mainView.fontFamily);
    setTreeViewFont(defaults.treeView.fontFamily);
  }

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={closeSettings}>
      <section
        aria-labelledby="settings-title"
        aria-modal="true"
        className="settings-panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p>Configure the two user fonts Carlo currently supports.</p>
          </div>
          <button className="settings-close" onClick={closeSettings} title="Close">
            ×
          </button>
        </header>

        <label className="settings-field">
          <span>Main editor font</span>
          <input
            autoFocus
            disabled={isLoading || isSaving}
            onChange={(event) => setMainViewFont(event.target.value)}
            placeholder="Font family"
            value={mainViewFont}
          />
        </label>

        <label className="settings-field">
          <span>Tree view font</span>
          <input
            disabled={isLoading || isSaving}
            onChange={(event) => setTreeViewFont(event.target.value)}
            placeholder="Font family"
            value={treeViewFont}
          />
        </label>

        {configPath ? <p className="settings-path">Config file: {configPath}</p> : null}

        <footer className="settings-actions">
          <button disabled={isSaving} onClick={resetDefaults} type="button">
            Reset Defaults
          </button>
          <span className="settings-spacer" />
          <button disabled={isSaving} onClick={closeSettings} type="button">
            Cancel
          </button>
          <button disabled={isLoading || isSaving} onClick={() => void save()} type="button">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </section>
    </div>
  );
}
