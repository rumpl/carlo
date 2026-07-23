import { useEffect } from 'react';
import type * as monaco from '@codingame/monaco-vscode-editor-api';
import { useEditorStore } from '../store/useEditorStore';
import { refreshVisibleGitGuttersForUri } from './editorRegistry';
import { getModel, isApplyingExternalContentUpdate } from './models';

interface ModelTracker {
  listener: monaco.IDisposable;
  modelDisposal: monaco.IDisposable;
  gitTimer: ReturnType<typeof setTimeout> | undefined;
}

const trackers = new Map<monaco.editor.ITextModel, ModelTracker>();
let consumers = 0;
let unsubscribeFromStore: (() => void) | undefined;

function disposeTracker(model: monaco.editor.ITextModel): void {
  const tracker = trackers.get(model);
  if (!tracker) return;
  tracker.listener.dispose();
  tracker.modelDisposal.dispose();
  if (tracker.gitTimer) clearTimeout(tracker.gitTimer);
  trackers.delete(model);
}

function syncTrackers(): void {
  const tabs = useEditorStore.getState().tabs;
  const openModels = new Set<monaco.editor.ITextModel>();

  for (const tab of tabs) {
    const model = getModel(tab.uri);
    if (!model) continue;
    openModels.add(model);
    if (trackers.has(model)) continue;

    const uri = tab.uri;
    const tracker: ModelTracker = {
      listener: model.onDidChangeContent(() => {
        if (!isApplyingExternalContentUpdate(model)) useEditorStore.getState().markDirty(uri);
        if (tracker.gitTimer) clearTimeout(tracker.gitTimer);
        tracker.gitTimer = setTimeout(() => {
          tracker.gitTimer = undefined;
          refreshVisibleGitGuttersForUri(uri);
        }, 150);
      }),
      modelDisposal: model.onWillDispose(() => disposeTracker(model)),
      gitTimer: undefined,
    };
    trackers.set(model, tracker);
  }

  for (const model of trackers.keys()) {
    if (!openModels.has(model) || model.isDisposed()) disposeTracker(model);
  }
}

function startTracking(): void {
  if (consumers++ > 0) return;
  syncTrackers();
  unsubscribeFromStore = useEditorStore.subscribe(syncTrackers);
}

function stopTracking(): void {
  consumers--;
  if (consumers > 0) return;
  consumers = 0;
  unsubscribeFromStore?.();
  unsubscribeFromStore = undefined;
  for (const model of [...trackers.keys()]) disposeTracker(model);
}

/**
 * Maintains one dirty-tracking listener per open Monaco model, shared by all
 * editor groups. The first mounted editor starts tracking and the last one
 * disposes every listener and pending gutter update.
 */
export function useModelDirtyTracking(): void {
  useEffect(() => {
    startTracking();
    return stopTracking;
  }, []);
}
