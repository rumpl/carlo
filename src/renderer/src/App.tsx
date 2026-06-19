import { lazy, Suspense, useEffect, useState } from 'react';
import { AppTitleBar } from './components/AppTitleBar';
import { FileTree } from './components/FileTree';
import { BottomPanel } from './components/BottomPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ensureVscodeServices } from './vscode/servicesReady';
import { useKeybindings } from './hooks/useKeybindings';
import { useWorkspaceExternalChanges } from './hooks/useWorkspaceExternalChanges';
import { activeTabInGroup, useEditorStore } from './store/useEditorStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useThemeStore } from './store/useThemeStore';
import { isGitDiffUri } from './git/diffTabs';
import { isMarkdownPreviewUri } from './markdown/previewTabs';

const minSidebarWidth = 180;
const maxSidebarWidth = 560;
const MonacoEditor = lazy(() => import('./editor/MonacoEditor').then((module) => ({ default: module.MonacoEditor })));
const GitDiffEditor = lazy(() => import('./editor/GitDiffEditor').then((module) => ({ default: module.GitDiffEditor })));
const MarkdownPreview = lazy(() => import('./components/MarkdownPreview').then((module) => ({ default: module.MarkdownPreview })));

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
    const unsubscribe = window.api.window.onCloseRequested(() => {
      void import('./editor/saveActions')
        .then(({ handleWindowCloseRequest }) => handleWindowCloseRequest())
        .catch(console.error);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    useThemeStore.getState().setTheme(useThemeStore.getState().themeId);
    void useSettingsStore.getState().loadSettings().catch(console.error);
    void ensureVscodeServices()
      .then(async () => {
        const [{ registerBuiltinCommands }, { registerEditorOpener }, { startProblemsSync }] = await Promise.all([
          import('./commands/builtinCommands'),
          import('./editor/editorOpener'),
          import('./problems/sync'),
        ]);
        registerBuiltinCommands();
        registerEditorOpener();
        startProblemsSync();
      })
      .catch(console.error);
  }, []);
  return (
    <main
      className="app-shell"
      style={{ gridTemplateColumns: `${sidebarWidth}px 4px minmax(0, 1fr)` }}
    >
      <AppTitleBar />
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
      <div className="main-area">
        <div className={`workbench split-${splitDirection}`}>
          {groups.map((group) => {
            const tab = activeTabInGroup(group.id);
            const hasActiveTab = Boolean(tab);
            return (
              <section className="editor-group" key={group.id}>
                <TabBar groupId={group.id} />
                {tab && isGitDiffUri(tab.uri) ? (
                  <Suspense fallback={<div className="editor-stack" />}>
                    <GitDiffEditor groupId={group.id} />
                  </Suspense>
                ) : tab && isMarkdownPreviewUri(tab.uri) ? (
                  <Suspense fallback={<div className="editor-stack" />}>
                    <MarkdownPreview groupId={group.id} />
                  </Suspense>
                ) : hasActiveTab ? (
                  <Suspense fallback={<div className="editor-stack" />}>
                    <MonacoEditor groupId={group.id} />
                  </Suspense>
                ) : (
                  <div className="editor-stack">
                    <WelcomeScreen />
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <BottomPanel />
      </div>
      <StatusBar />
      <SettingsPanel />
    </main>
  );
}
