export const CARLO_THEMES = [
  { id: 'Nord', label: 'Nord', kind: 'dark' },
  { id: 'Default Dark Modern', label: 'Default Dark Modern', kind: 'dark' },
  { id: 'Default Dark+', label: 'Default Dark+', kind: 'dark' },
  { id: 'Visual Studio Dark', label: 'Visual Studio Dark', kind: 'dark' },
  { id: 'Default Light Modern', label: 'Default Light Modern', kind: 'light' },
  { id: 'Default Light+', label: 'Default Light+', kind: 'light' },
  { id: 'Visual Studio Light', label: 'Visual Studio Light', kind: 'light' },
] as const;

export type CarloThemeId = (typeof CARLO_THEMES)[number]['id'];
export type CarloThemeKind = (typeof CARLO_THEMES)[number]['kind'];

export const CARLO_DEFAULT_THEME: CarloThemeId = 'Nord';

export interface CarloUserConfig {
  theme: CarloThemeId;
  mainView: {
    fontFamily: string;
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    formatOnSave: boolean;
  };
  treeView: {
    fontFamily: string;
  };
}

export function defaultUserConfig(): CarloUserConfig {
  return {
    theme: CARLO_DEFAULT_THEME,
    mainView: {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      formatOnSave: true,
    },
    treeView: {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    },
  };
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function themeIdValue(value: unknown, fallback: CarloThemeId): CarloThemeId {
  return typeof value === 'string' && CARLO_THEMES.some((theme) => theme.id === value)
    ? (value as CarloThemeId)
    : fallback;
}

export function mergeUserConfig(
  defaults: CarloUserConfig,
  config: Partial<CarloUserConfig> | undefined,
): CarloUserConfig {
  return {
    theme: themeIdValue(config?.theme, defaults.theme),
    mainView: {
      fontFamily: nonEmptyString(config?.mainView?.fontFamily, defaults.mainView.fontFamily),
      fontSize: numberInRange(config?.mainView?.fontSize, defaults.mainView.fontSize, 8, 40),
      tabSize: numberInRange(config?.mainView?.tabSize, defaults.mainView.tabSize, 1, 12),
      wordWrap: booleanValue(config?.mainView?.wordWrap, defaults.mainView.wordWrap),
      formatOnSave: booleanValue(config?.mainView?.formatOnSave, defaults.mainView.formatOnSave),
    },
    treeView: {
      fontFamily: nonEmptyString(config?.treeView?.fontFamily, defaults.treeView.fontFamily),
    },
  };
}
