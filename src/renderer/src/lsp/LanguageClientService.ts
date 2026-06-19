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
  detail?: string;
  logs: string[];
}

const clients = new Map<ServerLanguageId, ClientEntry>();
const listeners = new Set<() => void>();
let statusVersion = 0;

function emit(): void {
  statusVersion += 1;
  for (const listener of listeners) listener();
}
export function subscribeLspStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function lspStatusVersion(): number {
  return statusVersion;
}
export function lspStatus(languageId: LanguageId): string {
  const lang = serverLanguage(languageId);
  if (!lang) return 'unavailable';
  return clients.get(lang)?.status ?? 'stopped';
}

export function lspStatusDetail(languageId: LanguageId): string | undefined {
  const lang = serverLanguage(languageId);
  if (!lang) return undefined;
  return clients.get(lang)?.detail;
}

window.api.lsp.onServerExit(({ connectionId, code, signal }) => {
  for (const entry of clients.values()) {
    if (entry.connectionId === connectionId) {
      entry.status = code === 0 ? 'stopped' : 'error';
      entry.detail = `exited code ${code ?? 'null'}${signal ? ` signal ${signal}` : ''}`;
    }
  }
  emit();
});

window.api.lsp.onServerLog(({ languageId, message }) => {
  const lang = serverLanguage(languageId);
  const entry = lang ? clients.get(lang) : undefined;
  if (!entry) return;
  entry.detail = message.slice(0, 200);
  entry.logs = [...entry.logs, message].slice(-50);
  emit();
});

window.api.lsp.onServerStderr(({ languageId, data }) => {
  const lang = serverLanguage(languageId);
  const entry = lang ? clients.get(lang) : undefined;
  if (!entry) return;
  const line = data.trim().split('\n').at(-1) ?? data.trim();
  entry.detail = line.slice(0, 200);
  entry.logs = [...entry.logs, `stderr: ${data.trim()}`].slice(-50);
  emit();
});

export async function ensureLanguageClient(
  languageId: LanguageId,
  rootUri: string,
  documentUri: string,
): Promise<void> {
  const lang = serverLanguage(languageId);
  if (!lang) return;
  const existing = clients.get(lang);
  if (existing && (existing.status === 'running' || existing.status === 'starting')) return;
  const starting: Partial<ClientEntry> = { languageId: lang, status: 'starting', logs: [] };
  clients.set(lang, starting as ClientEntry);
  emit();
  const result = await window.api.lsp.start({ languageId: lang, rootUri, documentUri });
  if ('error' in result) {
    clients.set(lang, {
      ...(starting as ClientEntry),
      connectionId: '',
      client: undefined as unknown as MonacoLanguageClient,
      status: 'error',
      detail: result.error,
      logs: [result.error],
    });
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
    messageTransports: {
      reader: new IpcMessageReader(result.connectionId),
      writer: new IpcMessageWriter(result.connectionId),
    },
  });
  clients.set(lang, {
    languageId: lang,
    connectionId: result.connectionId,
    client,
    status: 'running',
    logs: [],
  });
  emit();
  await client.start().catch((error) => {
    const entry = clients.get(lang);
    if (entry) {
      entry.status = 'error';
      entry.detail = error instanceof Error ? error.message : String(error);
    }
    emit();
    throw error;
  });
}

export async function restartLanguageClient(
  languageId: LanguageId,
  rootUri: string,
  documentUri: string,
): Promise<void> {
  const lang = serverLanguage(languageId);
  if (!lang) return;
  const existing = clients.get(lang);
  if (existing?.connectionId) await window.api.lsp.stop(existing.connectionId);
  clients.delete(lang);
  await ensureLanguageClient(languageId, rootUri, documentUri);
}
