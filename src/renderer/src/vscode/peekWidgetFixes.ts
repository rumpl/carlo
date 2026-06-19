const lockedContainers = new WeakSet<HTMLElement>();
let installed = false;

function resetHorizontalScroll(container: HTMLElement): void {
  if (container.scrollLeft !== 0) container.scrollLeft = 0;

  const scrollableElement = container.parentElement;
  if (scrollableElement && scrollableElement.scrollLeft !== 0) {
    scrollableElement.scrollLeft = 0;
  }
}

function lockSplitViewContainer(container: HTMLElement): void {
  if (lockedContainers.has(container)) return;
  lockedContainers.add(container);

  const reset = () => resetHorizontalScroll(container);
  container.addEventListener('scroll', reset, { passive: true });

  const observer = new ResizeObserver(reset);
  observer.observe(container);

  requestAnimationFrame(reset);
}

function scanForReferencePeekSplitViews(): void {
  document
    .querySelectorAll<HTMLElement>(
      '.reference-zone-widget .monaco-split-view2 > .monaco-scrollable-element > .split-view-container',
    )
    .forEach(lockSplitViewContainer);
}

export function installPeekWidgetFixes(): void {
  if (installed) return;
  installed = true;

  const observer = new MutationObserver(scanForReferencePeekSplitViews);
  observer.observe(document.body, { childList: true, subtree: true });
  scanForReferencePeekSplitViews();
}
