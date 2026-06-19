import { useSyncExternalStore } from 'react';
import { activeTab, useEditorStore } from '../store/useEditorStore';
import { useThemeStore } from '../store/useThemeStore';
import {
  lspStatus,
  lspStatusDetail,
  lspStatusVersion,
  subscribeLspStatus,
} from '../lsp/LanguageClientService';

export function StatusBar() {
  useSyncExternalStore(subscribeLspStatus, lspStatusVersion);
  useEditorStore((state) => state.activeTabId);
  const theme = useThemeStore((state) => state.themeId);
  const tab = activeTab();
  const lsp = tab ? lspStatus(tab.languageId) : 'stopped';
  const lspDetail = tab ? lspStatusDetail(tab.languageId) : undefined;
  return (
    <footer className="status-bar">
      <span className="status-item">{tab?.languageId ?? 'no file'}</span>
      <span className="status-item" title={lspDetail}>
        LSP: {lsp}
      </span>
      <span className="status-spacer" />
      <span className="status-item">{theme}</span>
    </footer>
  );
}
