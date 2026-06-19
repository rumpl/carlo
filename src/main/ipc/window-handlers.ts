import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc';

const minZoomLevel = -4;
const maxZoomLevel = 5;
const zoomStep = 0.5;

function clamp(value: number): number {
  return Math.min(maxZoomLevel, Math.max(minZoomLevel, value));
}

export function registerWindowHandlers(): void {
  ipcMain.handle(IPC.windowZoomIn, (event) => {
    const nextZoomLevel = clamp(event.sender.getZoomLevel() + zoomStep);
    event.sender.setZoomLevel(nextZoomLevel);
    return { zoomLevel: nextZoomLevel };
  });

  ipcMain.handle(IPC.windowZoomOut, (event) => {
    const nextZoomLevel = clamp(event.sender.getZoomLevel() - zoomStep);
    event.sender.setZoomLevel(nextZoomLevel);
    return { zoomLevel: nextZoomLevel };
  });

  ipcMain.handle(IPC.windowZoomReset, (event) => {
    event.sender.setZoomLevel(0);
    return { zoomLevel: 0 };
  });
}
