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
  const [theme, setTheme] = useState<CarloThemeId>(config.theme);
  const [mainViewFont, setMainViewFont] = useState(config.mainView.fontFamily);
  const [treeViewFont, setTreeViewFont] = useState(config.treeView.fontFamily);
  const [fontSize, setFontSize] = useState(String(config.mainView.fontSize));
  const [tabSize, setTabSize] = useState(String(config.mainView.tabSize));
  const [wordWrap, setWordWrap] = useState(config.mainView.wordWrap);
  const [formatOnSave, setFormatOnSave] = useState(config.mainView.formatOnSave);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTheme(config.theme);
    setMainViewFont(config.mainView.fontFamily);
    setTreeViewFont(config.treeView.fontFamily);
    setFontSize(String(config.mainView.fontSize));
    setTabSize(String(config.mainView.tabSize));
    setWordWrap(config.mainView.wordWrap);
    setFormatOnSave(config.mainView.formatOnSave);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const draft: CarloUserConfig = {
    theme,
    mainView: {
      fontFamily: mainViewFont,
      fontSize: Number(fontSize),
      tabSize: Number(tabSize),
      wordWrap,
      formatOnSave,
    },
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
    setTheme(defaults.theme);
    setMainViewFont(defaults.mainView.fontFamily);
    setTreeViewFont(defaults.treeView.fontFamily);
    setFontSize(String(defaults.mainView.fontSize));
    setTabSize(String(defaults.mainView.tabSize));
    setWordWrap(defaults.mainView.wordWrap);
    setFormatOnSave(defaults.mainView.formatOnSave);
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
            onChange={(event) => setTheme(event.target.value as CarloThemeId)}
            value={theme}
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
            onChange={(event) => setMainViewFont(event.target.value)}
            placeholder="Font family"
            value={mainViewFont}
          />
        </label>

        <div className="settings-grid">
          <label className="settings-field">
            <span>Editor font size</span>
            <input
              disabled={isLoading || isSaving}
              max={40}
              min={8}
              onChange={(event) => setFontSize(event.target.value)}
              type="number"
              value={fontSize}
            />
          </label>

          <label className="settings-field">
            <span>Tab size</span>
            <input
              disabled={isLoading || isSaving}
              max={12}
              min={1}
              onChange={(event) => setTabSize(event.target.value)}
              type="number"
              value={tabSize}
            />
          </label>
        </div>

        <label className="settings-field">
          <span>Tree view font</span>
          <input
            disabled={isLoading || isSaving}
            onChange={(event) => setTreeViewFont(event.target.value)}
            placeholder="Font family"
            value={treeViewFont}
          />
        </label>

        <label className="settings-checkbox">
          <input
            checked={wordWrap}
            disabled={isLoading || isSaving}
            onChange={(event) => setWordWrap(event.target.checked)}
            type="checkbox"
          />
          <span>Word wrap</span>
        </label>

        <label className="settings-checkbox">
          <input
            checked={formatOnSave}
            disabled={isLoading || isSaving}
            onChange={(event) => setFormatOnSave(event.target.checked)}
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
