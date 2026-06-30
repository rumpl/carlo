import { useState } from 'react';

interface UseSidebarResizeOptions {
  minWidth: number;
  maxWidth: number;
  storageKey: string;
  /** Left offset (in px) of the element that precedes the sidebar (e.g. the activity bar width). */
  offset?: number;
}

interface PointerHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
}

interface UseSidebarResizeResult {
  sidebarWidth: number;
  pointerHandlers: PointerHandlers;
}

function initialSidebarWidth(storageKey: string, fallback: number): number {
  const stored = Number(localStorage.getItem(storageKey));
  return Number.isFinite(stored) && stored > 0 ? stored : fallback;
}

function clampSidebarWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

export function useSidebarResize({
  minWidth,
  maxWidth,
  storageKey,
  offset = 0,
}: UseSidebarResizeOptions): UseSidebarResizeResult {
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    initialSidebarWidth(storageKey, minWidth),
  );

  const onPointerDown = (event: React.PointerEvent<HTMLElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const nextWidth = clampSidebarWidth(event.clientX - offset, minWidth, maxWidth);
    setSidebarWidth(nextWidth);
    localStorage.setItem(storageKey, String(nextWidth));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return {
    sidebarWidth,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
