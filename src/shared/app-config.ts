export interface CarloUserConfig {
  mainView: {
    fontFamily: string;
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

export function mergeUserConfig(
  defaults: CarloUserConfig,
  config: Partial<CarloUserConfig> | undefined,
): CarloUserConfig {
  return {
    mainView: {
      fontFamily: nonEmptyString(config?.mainView?.fontFamily, defaults.mainView.fontFamily),
    },
    treeView: {
      fontFamily: nonEmptyString(config?.treeView?.fontFamily, defaults.treeView.fontFamily),
    },
  };
}
