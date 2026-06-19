export interface CarloUserConfig {
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

export function mergeUserConfig(
  defaults: CarloUserConfig,
  config: Partial<CarloUserConfig> | undefined,
): CarloUserConfig {
  return {
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
