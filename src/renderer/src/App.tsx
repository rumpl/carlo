import { useEffect, useState } from 'react';
import { registerBuiltinCommands } from './commands/builtinCommands';
import { FileTree } from './components/FileTree';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { MonacoEditor } from './editor/MonacoEditor';
import { registerEditorOpener } from './editor/editorOpener';
import { useKeybindings } from './hooks/useKeybindings';
import { useWorkspaceExternalChanges } from './hooks/useWorkspaceExternalChanges';
import { useEditorStore } from './store/useEditorStore';
import { useThemeStore } from './store/useThemeStore';

const minSidebarWidth = 180;
const maxSidebarWidth = 560;

function initialSidebarWidth(): number {
  const stored = Number(localStorage.getItem('carlo.sidebarWidth'));
  return Number.isFinite(stored) && stored > 0 ? stored : 260;
}

function clampSidebarWidth(width: number): number {
  return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, width));
}

export function App() {
  useKeybindings();
  useWorkspaceExternalChanges();
  const groups = useEditorStore((state) => state.groups);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);
  useEffect(() => {
    registerBuiltinCommands();
    registerEditorOpener();
    useThemeStore.getState().setTheme(useThemeStore.getState().themeId);
  }, []);
  return (
    <main
      className="app-shell"
      style={{ gridTemplateColumns: `${sidebarWidth}px 4px minmax(0, 1fr)` }}
    >
      <FileTree />
      <div
        className="sidebar-resizer"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const nextWidth = clampSidebarWidth(event.clientX);
          setSidebarWidth(nextWidth);
          localStorage.setItem('carlo.sidebarWidth', String(nextWidth));
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      />
      <div className={`workbench split-${splitDirection}`}>
        {groups.map((group) => (
          <section className="editor-group" key={group.id}>
            <TabBar groupId={group.id} />
            <MonacoEditor groupId={group.id} />
          </section>
        ))}
      </div>
      <StatusBar />
    </main>
  );
}
