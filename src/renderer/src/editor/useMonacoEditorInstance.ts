import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import * as monaco from '@codingame/monaco-vscode-editor-api';
import { ensureVscodeServices } from '../vscode/servicesReady';
import { editorOptions } from './editorOptions';
import {
  hasEditorForGroup,
  registerEditor,
  setActiveEditor,
  unregisterEditor,
} from './editorRegistry';
import { recordNavigationLocation } from './navigationHistory';

export function useMonacoEditorInstance({
  groupId,
  containerRef,
  setActiveGroup,
}: {
  groupId: string;
  containerRef: RefObject<HTMLDivElement | null>;
  setActiveGroup: (groupId: string) => void;
}): number {
  const [editorVersion, setEditorVersion] = useState(0);

  useEffect(() => {
    if (!containerRef.current || hasEditorForGroup(groupId)) return;
    let disposed = false;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;
    let focusDisposable: monaco.IDisposable | undefined;
    let cursorDisposable: monaco.IDisposable | undefined;
    let resizeObserver: ResizeObserver | undefined;

    void ensureVscodeServices()
      .then(() => {
        if (disposed || !containerRef.current || hasEditorForGroup(groupId)) return;
        const container = containerRef.current;
        const editor = monaco.editor.create(container, { ...editorOptions, model: null });
        resizeObserver = new ResizeObserver(() => editor.layout());
        resizeObserver.observe(container);
        requestAnimationFrame(() => editor.layout());
        registerEditor(groupId, editor);
        focusDisposable = editor.onDidFocusEditorWidget(() => {
          setActiveEditor(editor);
          setActiveGroup(groupId);
          recordNavigationLocation(editor);
        });
        cursorDisposable = editor.onDidChangeCursorPosition(() => {
          if (navigationTimer) clearTimeout(navigationTimer);
          navigationTimer = setTimeout(() => recordNavigationLocation(editor), 350);
        });
        setEditorVersion((version) => version + 1);
      })
      .catch(console.error);

    return () => {
      disposed = true;
      if (navigationTimer) clearTimeout(navigationTimer);
      focusDisposable?.dispose();
      cursorDisposable?.dispose();
      resizeObserver?.disconnect();
      unregisterEditor(groupId);
    };
  }, [groupId, containerRef, setActiveGroup]);

  return editorVersion;
}
