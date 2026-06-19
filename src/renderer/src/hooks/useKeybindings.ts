import { useEffect } from 'react';
import { runCommand } from '../commands/registry';

export function useKeybindings(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); void runCommand('workbench.action.showCommands'); }
      if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); void runCommand(event.shiftKey ? 'file.saveAs' : 'file.save'); }
      if (mod && event.key.toLowerCase() === 'o') { event.preventDefault(); void runCommand('file.open'); }
      if (mod && event.code === 'Space') { event.preventDefault(); void runCommand('editor.action.triggerSuggest'); }
    };
    const offMenu = window.api.menu.onCommand((commandId) => void runCommand(commandId));
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); offMenu(); };
  }, []);
}
