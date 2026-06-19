import { lazy, Suspense, useEffect, useState } from 'react';
import { FileTree } from './components/FileTree';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { ensureVscodeServices } from './vscode/servicesReady';
import { useKeybindings } from './hooks/useKeybindings';
import { useWorkspaceExternalChanges } from './hooks/useWorkspaceExternalChanges';
import { useEditorStore } from './store/useEditorStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useThemeStore } from './store/useThemeStore';

const minSidebarWidth = 180;
const maxSidebarWidth = 560;
const MonacoEditor = lazy(() => import('./editor/MonacoEditor').then((module) => ({ default: module.MonacoEditor })));

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
    useThemeStore.getState().setTheme(useThemeStore.getState().themeId);
    void useSettingsStore.getState().loadSettings().catch(console.error);
    void ensureVscodeServices()
      .then(async () => {
        const [{ registerBuiltinCommands }, { registerEditorOpener }] = await Promise.all([
          import('./commands/builtinCommands'),
          import('./editor/editorOpener'),
        ]);
        registerBuiltinCommands();
        registerEditorOpener();
      })
      .catch(console.error);
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
            <Suspense fallback={<div className="editor-stack" />}>
              <MonacoEditor groupId={group.id} />
            </Suspense>
          </section>
        ))}
      </div>
      <StatusBar />
      <SettingsPanel />
    </main>
  );
}
