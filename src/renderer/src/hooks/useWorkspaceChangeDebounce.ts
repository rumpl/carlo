import { useEffect } from 'react';

/**
 * Subscribes to workspace change events for the given rootPath and invokes
 * the callback after a debounce delay.  The subscription and any pending
 * timer are cleaned up automatically when the component unmounts or when the
 * dependencies change.
 */
export function useWorkspaceChangeDebounce(
  rootPath: string | undefined,
  callback: () => void,
  delay: number,
): void {
  useEffect(() => {
    if (!rootPath) return;
    let timer: number | undefined;
    const unsubscribe = window.api.workspace.onChanged(({ rootPath: changedPath }) => {
      if (changedPath !== rootPath) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(callback, delay);
    });
    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [rootPath, callback, delay]);
}
