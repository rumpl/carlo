declare global {
  var __carloEnsureVscodeServicesPromise: Promise<void> | undefined;
}

export function ensureVscodeServices(): Promise<void> {
  globalThis.__carloEnsureVscodeServicesPromise ??= import('./initServices').then(({ initVscodeServices }) =>
    initVscodeServices(),
  );
  return globalThis.__carloEnsureVscodeServicesPromise;
}

/**
 * Monaco modules install standalone fallback services as a side effect when
 * they are evaluated. Always initialize our VS Code service overrides before
 * importing one of those modules, otherwise the fallback services win the
 * race and cannot be replaced.
 */
export async function loadAfterVscodeServices<T>(loader: () => Promise<T>): Promise<T> {
  await ensureVscodeServices();
  return loader();
}
