import { lazy, Suspense, useEffect, useState } from 'react';
import { ActivityBar } from './components/ActivityBar';
import { AppTitleBar } from './components/AppTitleBar';
import { FileTree } from './components/FileTree';
import { BottomPanel } from './components/BottomPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ensureVscodeServices, loadAfterVscodeServices } from './vscode/servicesReady';
import { useKeybindings } from './hooks/useKeybindings';
import { useSidebarResize } from './hooks/useSidebarResize';
import { useWorkspaceExternalChanges } from './hooks/useWorkspaceExternalChanges';
import { activeTabInGroup, useEditorStore } from './store/useEditorStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useThemeStore } from './store/useThemeStore';
import { useWorkbenchUiStore } from './store/useWorkbenchUiStore';
import { isGitDiffUri } from './git/diffTabs';
import { isMarkdownPreviewUri } from './markdown/previewTabs';

const activityBarWidth = 42;
const MonacoEditor = lazy(() =>
  loadAfterVscodeServices(() => import('./editor/MonacoEditor')).then((module) => ({ default: module.MonacoEditor })),
);
const GitDiffEditor = lazy(() =>
  loadAfterVscodeServices(() => import('./editor/GitDiffEditor')).then((module) => ({ default: module.GitDiffEditor })),
);
const MarkdownPreview = lazy(() => import('./components/MarkdownPreview').then((module) => ({ default: module.MarkdownPreview })));

export function App() {
  useKeybindings();
  useWorkspaceExternalChanges();
  const [warmEditor, setWarmEditor] = useState(false);
  const groups = useEditorStore((state) => state.groups);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const sidebarVisible = useWorkbenchUiStore((state) => state.sidebarVisible);
  const { sidebarWidth, pointerHandlers } = useSidebarResize({
    minWidth: 180,
    maxWidth: 560,
    storageKey: 'carlo.sidebarWidth',
    offset: activityBarWidth,
  });
  useEffect(() => {
    const unsubscribe = window.api.window.onCloseRequested(() => {
      void import('./editor/saveActions')
        .then(({ handleWindowCloseRequest }) => handleWindowCloseRequest())
        .catch(console.error);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const idleCallback = window.requestIdleCallback(() => setWarmEditor(true), { timeout: 500 });
    return () => window.cancelIdleCallback(idleCallback);
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
      style={{
        gridTemplateColumns: sidebarVisible
          ? `${activityBarWidth}px ${sidebarWidth}px 4px minmax(0, 1fr)`
          : `${activityBarWidth}px 0 0 minmax(0, 1fr)`,
      }}
    >
      <AppTitleBar />
      <ActivityBar />
      {sidebarVisible ? <FileTree /> : null}
      {sidebarVisible ? (
        <div
          className="sidebar-resizer"
          {...pointerHandlers}
        />
      ) : null}
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
                ) : hasActiveTab || warmEditor ? (
                  <Suspense
                    fallback={
                      <div className="editor-stack">
                        {!hasActiveTab ? <WelcomeScreen /> : null}
                      </div>
                    }
                  >
                    <MonacoEditor groupId={group.id}>
                      {!hasActiveTab ? <WelcomeScreen /> : null}
                    </MonacoEditor>
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
