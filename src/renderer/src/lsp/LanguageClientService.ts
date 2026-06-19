import * as monaco from '@codingame/monaco-vscode-editor-api';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { CloseAction, ErrorAction } from 'vscode-languageclient/browser.js';
import type { LanguageId, ServerLanguageId } from '@shared/language-registry';
import { serverLanguage } from './documentSelectors';
import { IpcMessageReader, IpcMessageWriter } from './IpcMessageTransport';

interface ClientEntry {
  languageId: ServerLanguageId;
  connectionId: string;
  client: MonacoLanguageClient;
  status: 'starting' | 'running' | 'stopped' | 'error';
}

const clients = new Map<ServerLanguageId, ClientEntry>();
const listeners = new Set<() => void>();

function emit(): void { for (const listener of listeners) listener(); }
export function subscribeLspStatus(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function lspStatus(languageId: LanguageId): string { const lang = serverLanguage(languageId); return lang ? (clients.get(lang)?.status ?? 'stopped') : 'unavailable'; }

window.api.lsp.onServerExit(({ connectionId }) => {
  for (const entry of clients.values()) {
    if (entry.connectionId === connectionId) entry.status = 'stopped';
  }
  emit();
});

export async function ensureLanguageClient(languageId: LanguageId, rootUri: string, documentUri: string): Promise<void> {
  const lang = serverLanguage(languageId);
  if (!lang) return;
  const existing = clients.get(lang);
  if (existing && (existing.status === 'running' || existing.status === 'starting')) return;
  const starting: Partial<ClientEntry> = { languageId: lang, status: 'starting' };
  clients.set(lang, starting as ClientEntry);
  emit();
  const result = await window.api.lsp.start({ languageId: lang, rootUri, documentUri });
  if ('error' in result) {
    clients.set(lang, { ...(starting as ClientEntry), connectionId: '', client: undefined as unknown as MonacoLanguageClient, status: 'error' });
    emit();
    throw new Error(result.error);
  }
  const client = new MonacoLanguageClient({
    name: `${lang} language client`,
    clientOptions: {
      documentSelector: [lang],
      workspaceFolder: { uri: monaco.Uri.parse(rootUri), name: 'workspace', index: 0 },
      errorHandler: {
        error: () => ({ action: ErrorAction.Continue }),
        closed: () => ({ action: CloseAction.DoNotRestart }),
      },
    },
    messageTransports: { reader: new IpcMessageReader(result.connectionId), writer: new IpcMessageWriter(result.connectionId) },
  });
  clients.set(lang, { languageId: lang, connectionId: result.connectionId, client, status: 'running' });
  emit();
  await client.start();
}

export async function restartLanguageClient(languageId: LanguageId, rootUri: string, documentUri: string): Promise<void> {
  const lang = serverLanguage(languageId);
  if (!lang) return;
  const existing = clients.get(lang);
  if (existing?.connectionId) await window.api.lsp.stop(existing.connectionId);
  clients.delete(lang);
  await ensureLanguageClient(languageId, rootUri, documentUri);
}
