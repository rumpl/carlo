import { useEffect, useState } from 'react';
import type { LanguageId } from '@shared/language-registry';
import { activeTab, useEditorStore } from '../store/useEditorStore';

type LspStatus = 'running' | 'starting' | 'stopped' | 'error' | 'unavailable';

const lspIcons: Record<string, string> = {
  running: '●',
  starting: '◐',
  stopped: '○',
  error: '×',
  unavailable: '—',
};

export function StatusBar() {
  useEditorStore((state) => state.activeTabId);
  const tab = activeTab();
  const [lsp, setLsp] = useState<{ status: LspStatus; detail?: string }>({ status: 'stopped' });

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const update = async (languageId: LanguageId | undefined) => {
      if (!languageId) {
        setLsp({ status: 'stopped' });
        return;
      }
      const service = await import('../lsp/LanguageClientService');
      if (disposed) return;
      setLsp({ status: service.lspStatus(languageId) as LspStatus, detail: service.lspStatusDetail(languageId) });
      unsubscribe ??= service.subscribeLspStatus(() => void update(languageId));
    };
    void update(tab?.languageId).catch(console.error);
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [tab?.languageId]);

  return (
    <footer className="status-bar">
      <span className="status-spacer" />
      <span className={`status-item lsp-status lsp-status-${lsp.status}`} title={lsp.detail ?? `LSP: ${lsp.status}`}>
        <span className="lsp-status-icon" aria-hidden="true">
          {lspIcons[lsp.status] ?? '○'}
        </span>
        <span>LSP: {lsp.status}</span>
      </span>
    </footer>
  );
}
