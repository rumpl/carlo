declare global {
  var __carloEnsureVscodeServicesPromise: Promise<void> | undefined;
}

export function ensureVscodeServices(): Promise<void> {
  globalThis.__carloEnsureVscodeServicesPromise ??= import('./initServices').then(({ initVscodeServices }) =>
    initVscodeServices(),
  );
  return globalThis.__carloEnsureVscodeServicesPromise;
}
