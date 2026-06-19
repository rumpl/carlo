import { app } from 'electron';
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGE_SERVERS, type ServerLanguageId } from '@shared/language-registry';

export interface ResolvedServer {
  command: string;
  args: string[];
  cwd?: string;
}

function canExecute(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function binName(command: string): string {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}

export function resolveServer(languageId: ServerLanguageId, rootUri: string): ResolvedServer {
  const server = LANGUAGE_SERVERS[languageId];
  const commandName = server.command;
  const candidates = [
    join(process.cwd(), 'node_modules', '.bin', binName(commandName)),
    join(app.getAppPath(), 'node_modules', '.bin', binName(commandName)),
    join(process.resourcesPath ?? '', 'app.asar.unpacked', 'node_modules', '.bin', binName(commandName)),
  ];
  const command = candidates.find(canExecute) ?? commandName;
  const cwd = rootUri.startsWith('file://') ? fileURLToPath(rootUri) : undefined;
  return { command, args: [...server.args], cwd };
}
