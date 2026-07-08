import * as monaco from '@codingame/monaco-vscode-editor-api';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { CloseAction, ErrorAction } from 'vscode-languageclient/browser.js';
import type { LanguageId, ServerLanguageId } from '@shared/language-registry';
import type { LspStatus as LspClientStatus } from '@shared/lsp-types';
import { serverLanguage } from './documentSelectors';
import { IpcMessageReader, IpcMessageWriter } from './IpcMessageTransport';

interface ClientEntry {
  languageId: ServerLanguageId;
  rootUri: string;
  connectionId?: string;
  client?: MonacoLanguageClient;
  status: LspClientStatus;
  detail?: string;
  logs: string[];
  disposed: boolean;
}

const clients = new Map<string, ClientEntry>();
const listeners = new Set<() => void>();
let statusVersion = 0;

function clientKey(languageId: ServerLanguageId, rootUri: string): string {
  return `${languageId}\0${rootUri}`;
}

function entryFor(languageId: ServerLanguageId, rootUri?: string): ClientEntry | undefined {
  if (rootUri) return clients.get(clientKey(languageId, rootUri));
  return [...clients.values()].find((entry) => entry.languageId === languageId);
}

function entryForConnection(connectionId: string): ClientEntry | undefined {
  return [...clients.values()].find((entry) => entry.connectionId === connectionId);
}

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
export function lspStatus(languageId: LanguageId, rootUri?: string): string {
  const lang = serverLanguage(languageId);
  if (!lang) return 'unavailable';
  return entryFor(lang, rootUri)?.status ?? 'stopped';
}

export function lspStatusDetail(languageId: LanguageId, rootUri?: string): string | undefined {
  const lang = serverLanguage(languageId);
  if (!lang) return undefined;
  return entryFor(lang, rootUri)?.detail;
}

window.api.lsp.onServerExit(({ connectionId, code, signal }) => {
  const entry = entryForConnection(connectionId);
  if (!entry) return;
  entry.status = code === 0 ? 'stopped' : 'error';
  entry.detail = `exited code ${code ?? 'null'}${signal ? ` signal ${signal}` : ''}`;
  emit();
});

window.api.lsp.onServerLog(({ connectionId, languageId, message }) => {
  const lang = serverLanguage(languageId);
  const entry = connectionId ? entryForConnection(connectionId) : lang ? entryFor(lang) : undefined;
  if (!entry) return;
  entry.detail = message.slice(0, 200);
  entry.logs = [...entry.logs, message].slice(-50);
  emit();
});

window.api.lsp.onServerStderr(({ connectionId, languageId, data }) => {
  const lang = serverLanguage(languageId);
  const entry = connectionId ? entryForConnection(connectionId) : lang ? entryFor(lang) : undefined;
  if (!entry) return;
  const line = data.trim().split('\n').at(-1) ?? data.trim();
  entry.detail = line.slice(0, 200);
  entry.logs = [...entry.logs, `stderr: ${data.trim()}`].slice(-50);
  emit();
});

async function stopEntry(entry: ClientEntry): Promise<void> {
  entry.disposed = true;
  clients.delete(clientKey(entry.languageId, entry.rootUri));
  entry.status = 'stopped';
  emit();

  if (entry.client) {
    await entry.client.stop().catch((error: unknown) => {
      console.error('Failed to stop language client', error);
    });
  }
  if (entry.connectionId) await window.api.lsp.stop(entry.connectionId);
}

async function stopEntries(predicate: (entry: ClientEntry) => boolean): Promise<void> {
  const entries = [...clients.values()].filter(predicate);
  await Promise.all(entries.map((entry) => stopEntry(entry)));
}

export async function stopLanguageClientsForWorkspace(rootUri: string): Promise<void> {
  await stopEntries((entry) => entry.rootUri === rootUri);
}

export async function stopLanguageClientsExceptWorkspace(rootUri: string): Promise<void> {
  await stopEntries((entry) => entry.rootUri !== rootUri);
}

export async function ensureLanguageClient(
  languageId: LanguageId,
  rootUri: string,
  documentUri: string,
): Promise<void> {
  const lang = serverLanguage(languageId);
  if (!lang) return;
  const key = clientKey(lang, rootUri);
  const existing = clients.get(key);
  if (existing && (existing.status === 'running' || existing.status === 'starting')) return;

  await stopEntries((entry) => entry.languageId === lang && entry.rootUri !== rootUri);

  const starting: ClientEntry = {
    languageId: lang,
    rootUri,
    status: 'starting',
    detail: `starting for ${rootUri}`,
    logs: [],
    disposed: false,
  };
  clients.set(key, starting);
  emit();

  const result = await window.api.lsp.start({ languageId: lang, rootUri, documentUri });
  if ('error' in result) {
    if (clients.get(key) === starting && !starting.disposed) {
      clients.set(key, {
        ...starting,
        status: 'error',
        detail: result.error,
        logs: [result.error],
      });
      emit();
    }
    throw new Error(result.error);
  }
  if (clients.get(key) !== starting || starting.disposed) {
    await window.api.lsp.stop(result.connectionId);
    return;
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
  clients.set(key, {
    languageId: lang,
    rootUri,
    connectionId: result.connectionId,
    client,
    status: 'running',
    detail: `root ${rootUri}`,
    logs: [],
    disposed: false,
  });
  emit();
  await client.start().catch((error: unknown) => {
    const entry = clients.get(key);
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
  const existing = clients.get(clientKey(lang, rootUri));
  if (existing) await stopEntry(existing);
  await ensureLanguageClient(languageId, rootUri, documentUri);
}
