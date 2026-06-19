import { useEffect } from 'react';
import { runCommand } from '../commands/registry';
import { getEditor } from '../editor/MonacoEditor';

export function useKeybindings(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'p' && !event.repeat) {
        event.preventDefault();
        event.stopPropagation();
        void runCommand(
          event.shiftKey ? 'workbench.action.showCommands' : 'workbench.action.quickOpen',
        );
      }
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void runCommand(event.shiftKey ? 'file.saveAs' : 'file.save');
      }
      if (mod && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void runCommand('file.open');
      }
      if (mod && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('tab.close');
      }
      if (mod && event.key === '[') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('workbench.action.navigateBack');
      }
      if (mod && event.key === ']') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('workbench.action.navigateForward');
      }
      if (mod && (event.key === '=' || event.key === '+')) {
        event.preventDefault();
        void runCommand('window.zoomIn');
      }
      if (mod && event.key === '-') {
        event.preventDefault();
        void runCommand('window.zoomOut');
      }
      if (mod && event.key === '0') {
        event.preventDefault();
        void runCommand('window.zoomReset');
      }
      if (mod && event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('workbench.action.splitEditorRight');
      }
      if (mod && event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('workbench.action.splitEditorDown');
      }
      if (mod && event.code === 'Space') {
        event.preventDefault();
        void runCommand('editor.action.triggerSuggest');
      }
    };
    const offMenu = window.api.menu.onCommand((commandId) => void runCommand(commandId));
    const editorDisposable = getEditor()?.onKeyDown((event) => {
      const browserEvent = event.browserEvent;
      const mod = browserEvent.metaKey || browserEvent.ctrlKey;
      if (mod && browserEvent.key.toLowerCase() === 'p' && !browserEvent.repeat) {
        browserEvent.preventDefault();
        browserEvent.stopPropagation();
        event.preventDefault();
        void runCommand(
          browserEvent.shiftKey ? 'workbench.action.showCommands' : 'workbench.action.quickOpen',
        );
      }
      if (mod && browserEvent.key.toLowerCase() === 'w') {
        browserEvent.preventDefault();
        browserEvent.stopPropagation();
        event.preventDefault();
        void runCommand('tab.close');
      }
      if (mod && browserEvent.key === '[') {
        browserEvent.preventDefault();
        browserEvent.stopPropagation();
        event.preventDefault();
        void runCommand('workbench.action.navigateBack');
      }
      if (mod && browserEvent.key === ']') {
        browserEvent.preventDefault();
        browserEvent.stopPropagation();
        event.preventDefault();
        void runCommand('workbench.action.navigateForward');
      }
      if (mod && (browserEvent.key === '=' || browserEvent.key === '+')) {
        browserEvent.preventDefault();
        event.preventDefault();
        void runCommand('window.zoomIn');
      }
      if (mod && browserEvent.key === '-') {
        browserEvent.preventDefault();
        event.preventDefault();
        void runCommand('window.zoomOut');
      }
      if (mod && browserEvent.key === '0') {
        browserEvent.preventDefault();
        event.preventDefault();
        void runCommand('window.zoomReset');
      }
      if (mod && browserEvent.altKey && browserEvent.key === 'ArrowRight') {
        browserEvent.preventDefault();
        browserEvent.stopPropagation();
        event.preventDefault();
        void runCommand('workbench.action.splitEditorRight');
      }
      if (mod && browserEvent.altKey && browserEvent.key === 'ArrowDown') {
        browserEvent.preventDefault();
        browserEvent.stopPropagation();
        event.preventDefault();
        void runCommand('workbench.action.splitEditorDown');
      }
    });
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      editorDisposable?.dispose();
      offMenu();
    };
  }, []);
}
