import { useEffect } from 'react';
import { registerBuiltinCommands } from './commands/builtinCommands';
import { CommandPalette } from './components/CommandPalette';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { MonacoEditor } from './editor/MonacoEditor';
import { getOrCreateModel } from './editor/models';
import { useKeybindings } from './hooks/useKeybindings';
import { useEditorStore } from './store/useEditorStore';
import { useThemeStore } from './store/useThemeStore';

const sampleUri = 'file:///carlo-welcome.ts';
const sample = `type Greeting = 'hello carlo';\n\nconst message: Greeting = 'hello carlo';\nconsole.log(message);\n`;

export function App() {
  useKeybindings();
  useEffect(() => {
    registerBuiltinCommands();
    useThemeStore.getState().setTheme(useThemeStore.getState().themeId);
    getOrCreateModel(sampleUri, sample, 'typescript');
    useEditorStore.getState().openFile({ uri: sampleUri, path: '/carlo-welcome.ts', languageId: 'typescript', title: 'carlo-welcome.ts' });
  }, []);
  return <main className="app-shell"><TabBar /><MonacoEditor /><StatusBar /><CommandPalette /></main>;
}
