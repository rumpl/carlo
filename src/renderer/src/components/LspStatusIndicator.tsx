import { useEffect, useState } from 'react';
import type { LanguageId } from '@shared/language-registry';

type LspStatus = 'running' | 'starting' | 'stopped' | 'error' | 'unavailable';

const lspIcons: Record<string, string> = {
  running: '●',
  starting: '◐',
  stopped: '○',
  error: '×',
  unavailable: '—',
};

interface LspStatusIndicatorProps {
  languageId: LanguageId | undefined;
  rootUri: string | undefined;
}

export function LspStatusIndicator({ languageId, rootUri }: LspStatusIndicatorProps) {
  const [lsp, setLsp] = useState<{ status: LspStatus; detail?: string }>({ status: 'stopped' });

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const update = async (lang: LanguageId | undefined) => {
      if (!lang) {
        setLsp({ status: 'stopped' });
        return;
      }
      const service = await import('../lsp/LanguageClientService');
      if (disposed) return;
      setLsp({ status: service.lspStatus(lang, rootUri) as LspStatus, detail: service.lspStatusDetail(lang, rootUri) });
      unsubscribe ??= service.subscribeLspStatus(() => void update(lang));
    };
    void update(languageId).catch(console.error);
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [languageId, rootUri]);

  return (
    <span
      className={`status-item lsp-status lsp-status-${lsp.status}`}
      title={lsp.detail ?? `LSP: ${lsp.status}`}
    >
      <span className="lsp-status-icon" aria-hidden="true">
        {lspIcons[lsp.status] ?? '○'}
      </span>
      <span>LSP: {lsp.status}</span>
    </span>
  );
}
