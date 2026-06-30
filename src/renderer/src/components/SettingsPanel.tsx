import { useEffect, useState } from 'react';
import { CARLO_THEMES, defaultUserConfig, type CarloThemeId, type CarloUserConfig } from '@shared/app-config';
import { useSettingsStore } from '../store/useSettingsStore';

export function SettingsPanel() {
  const config = useSettingsStore((state) => state.config);
  const configPath = useSettingsStore((state) => state.configPath);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isOpen = useSettingsStore((state) => state.isOpen);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const [draft, setDraft] = useState<CarloUserConfig>(config);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

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
    setDraft(defaultUserConfig());
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
            <p>Configure the editor basics Carlo supports.</p>
          </div>
          <button className="settings-close" onClick={closeSettings} title="Close">
            ×
          </button>
        </header>

        <label className="settings-field">
          <span>Theme</span>
          <select
            autoFocus
            disabled={isLoading || isSaving}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, theme: event.target.value as CarloThemeId }))
            }
            value={draft.theme}
          >
            {CARLO_THEMES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>Main editor font</span>
          <input
            disabled={isLoading || isSaving}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                mainView: { ...prev.mainView, fontFamily: event.target.value },
              }))
            }
            placeholder="Font family"
            value={draft.mainView.fontFamily}
          />
        </label>

        <div className="settings-grid">
          <label className="settings-field">
            <span>Editor font size</span>
            <input
              disabled={isLoading || isSaving}
              max={40}
              min={8}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  mainView: { ...prev.mainView, fontSize: Number(event.target.value) },
                }))
              }
              type="number"
              value={draft.mainView.fontSize}
            />
          </label>

          <label className="settings-field">
            <span>Tab size</span>
            <input
              disabled={isLoading || isSaving}
              max={12}
              min={1}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  mainView: { ...prev.mainView, tabSize: Number(event.target.value) },
                }))
              }
              type="number"
              value={draft.mainView.tabSize}
            />
          </label>
        </div>

        <label className="settings-field">
          <span>Tree view font</span>
          <input
            disabled={isLoading || isSaving}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                treeView: { ...prev.treeView, fontFamily: event.target.value },
              }))
            }
            placeholder="Font family"
            value={draft.treeView.fontFamily}
          />
        </label>

        <label className="settings-checkbox">
          <input
            checked={draft.mainView.wordWrap}
            disabled={isLoading || isSaving}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                mainView: { ...prev.mainView, wordWrap: event.target.checked },
              }))
            }
            type="checkbox"
          />
          <span>Word wrap</span>
        </label>

        <label className="settings-checkbox">
          <input
            checked={draft.mainView.formatOnSave}
            disabled={isLoading || isSaving}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                mainView: { ...prev.mainView, formatOnSave: event.target.checked },
              }))
            }
            type="checkbox"
          />
          <span>Format on save</span>
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
