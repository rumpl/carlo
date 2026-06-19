import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js';
import type { Message } from 'vscode-jsonrpc';
import { IPC } from '@shared/ipc';
import { hasLanguageServer } from '@shared/language-registry';
import type { LspStartOptions } from '@shared/lsp-types';
import { resolveServer } from './resolveServer';

interface Connection {
  proc: ChildProcessWithoutNullStreams;
  reader: StreamMessageReader;
  writer: StreamMessageWriter;
}

export class LspServerManager {
  private readonly connections = new Map<string, Connection>();

  constructor(private readonly send: (channel: string, payload: unknown) => void) {}

  start(opts: LspStartOptions): string {
    if (!hasLanguageServer(opts.languageId))
      throw new Error(`No language server for ${opts.languageId}`);
    const { command, args, cwd, env, debug } = resolveServer(opts.languageId, opts.rootUri);
    const proc = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    const reader = new StreamMessageReader(proc.stdout);
    const writer = new StreamMessageWriter(proc.stdin);
    const connectionId = randomUUID();

    const log = (message: string) => this.send(IPC.lspServerLog, { connectionId, languageId: opts.languageId, message });
    console.error(`[lsp ${opts.languageId}] start ${command} ${args.join(' ')} ${debug}`);
    log(`start ${command} ${args.join(' ')}; ${debug}`);

    reader.listen((message: Message) => this.send(IPC.lspFromServer, { connectionId, message }));
    proc.stderr.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      console.error(`[lsp ${opts.languageId}] ${data}`);
      this.send(IPC.lspServerStderr, { connectionId, languageId: opts.languageId, data });
    });
    proc.on('error', (error) => {
      console.error(`[lsp ${opts.languageId}] failed to spawn`, error);
      log(`spawn error: ${error.message}`);
      this.send(IPC.lspServerExit, { connectionId, code: null, signal: String(error.message) });
      this.connections.delete(connectionId);
    });
    proc.on('exit', (code, signal) => {
      log(`exit code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      this.send(IPC.lspServerExit, { connectionId, code, signal });
      this.connections.delete(connectionId);
    });

    this.connections.set(connectionId, { proc, reader, writer });
    return connectionId;
  }

  toServer(connectionId: string, message: Message): void {
    void this.connections.get(connectionId)?.writer.write(message);
  }

  stop(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    connection.reader.dispose();
    connection.writer.dispose();
    connection.proc.kill();
    this.connections.delete(connectionId);
  }

  stopAll(): void {
    for (const connectionId of [...this.connections.keys()]) this.stop(connectionId);
  }
}
