import {
  AbstractMessageReader,
  AbstractMessageWriter,
  type DataCallback,
  type Message,
  type MessageReader,
  type MessageWriter,
} from 'vscode-jsonrpc';

export class IpcMessageReader extends AbstractMessageReader implements MessageReader {
  private unsubscribe?: () => void;
  constructor(private readonly connectionId: string) {
    super();
  }
  listen(callback: DataCallback) {
    this.unsubscribe = window.api.lsp.onFromServer((id, message) => {
      if (id === this.connectionId) callback(message as Message);
    });
    return { dispose: () => this.unsubscribe?.() };
  }
  override dispose(): void {
    this.unsubscribe?.();
    super.dispose();
  }
}

export class IpcMessageWriter extends AbstractMessageWriter implements MessageWriter {
  constructor(private readonly connectionId: string) {
    super();
  }
  async write(message: Message): Promise<void> {
    window.api.lsp.toServer(this.connectionId, message);
  }
  end(): void {}
}
