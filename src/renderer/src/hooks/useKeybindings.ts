import { useEffect } from 'react';
import { runCommand } from '../commands/registry';

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
      if (mod && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('workbench.action.findInFiles');
      }
      if (mod && event.key === ',') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('preferences.openSettings');
      }
      if (mod && event.key === '.') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('editor.action.quickFix');
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
      if (mod && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('workbench.panel.problems.toggle');
      }
      if (event.key === 'F2') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand('editor.action.rename');
      }
      if (event.key === 'F8') {
        event.preventDefault();
        event.stopPropagation();
        void runCommand(event.shiftKey ? 'editor.action.marker.prev' : 'editor.action.marker.next');
      }
      if (mod && event.code === 'Space') {
        event.preventDefault();
        void runCommand('editor.action.triggerSuggest');
      }
    };
    const offMenu = window.api.menu.onCommand((commandId) => void runCommand(commandId));
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      offMenu();
    };
  }, []);
}
