import { useSyncExternalStore } from 'react';
import { activeTab, useEditorStore } from '../store/useEditorStore';
import { useThemeStore } from '../store/useThemeStore';
import { lspStatus, subscribeLspStatus } from '../lsp/LanguageClientService';

export function StatusBar() {
  useSyncExternalStore(subscribeLspStatus, () => 0);
  useEditorStore((state) => state.activeTabId);
  const theme = useThemeStore((state) => state.themeId);
  const tab = activeTab();
  return <footer className="status-bar"><span>{tab?.languageId ?? 'no file'}</span><span>LSP: {tab ? lspStatus(tab.languageId) : 'stopped'}</span><span>{theme}</span></footer>;
}
