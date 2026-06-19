import { useSyncExternalStore } from 'react';
import { activeTab, useEditorStore } from '../store/useEditorStore';
import {
  lspStatus,
  lspStatusDetail,
  lspStatusVersion,
  subscribeLspStatus,
} from '../lsp/LanguageClientService';

const lspIcons: Record<string, string> = {
  running: '●',
  starting: '◐',
  stopped: '○',
  error: '×',
  unavailable: '—',
};

export function StatusBar() {
  useSyncExternalStore(subscribeLspStatus, lspStatusVersion);
  useEditorStore((state) => state.activeTabId);
  const tab = activeTab();
  const lsp = tab ? lspStatus(tab.languageId) : 'stopped';
  const lspDetail = tab ? lspStatusDetail(tab.languageId) : undefined;
  return (
    <footer className="status-bar">
      <span className="status-spacer" />
      <span className={`status-item lsp-status lsp-status-${lsp}`} title={lspDetail ?? `LSP: ${lsp}`}>
        <span className="lsp-status-icon" aria-hidden="true">
          {lspIcons[lsp] ?? '○'}
        </span>
        <span>LSP: {lsp}</span>
      </span>
    </footer>
  );
}
