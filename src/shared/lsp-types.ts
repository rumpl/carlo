import type { Message } from 'vscode-jsonrpc';
import type { LanguageId } from './language-registry';

export interface LspStartOptions {
  languageId: LanguageId;
  rootUri: string;
  documentUri: string;
}

export interface LspStartSuccess {
  connectionId: string;
}

export interface LspStartFailure {
  error: string;
}

export type LspStartResult = LspStartSuccess | LspStartFailure;

export interface LspStopRequest {
  connectionId: string;
}

export interface LspStopResult {
  ok: true;
}

export interface LspToServerPayload {
  connectionId: string;
  message: Message;
}

export interface LspFromServerPayload {
  connectionId: string;
  message: Message;
}

export interface LspServerExit {
  connectionId: string;
  code: number | null;
  signal: string | null;
}

export type LspStatus = 'stopped' | 'starting' | 'running' | 'error';
