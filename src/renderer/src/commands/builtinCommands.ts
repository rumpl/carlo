import { registerApplicationCommands } from './builtin/applicationCommands';
import { registerEditorCommands } from './builtin/editorCommands';
import { registerFileCommands } from './builtin/fileCommands';
import { registerPreferencesCommands } from './builtin/preferencesCommands';
import { registerWorkbenchCommands } from './builtin/workbenchCommands';

export function registerBuiltinCommands(): void {
  registerApplicationCommands();
  registerFileCommands();
  registerWorkbenchCommands();
  registerEditorCommands();
  registerPreferencesCommands();
}
