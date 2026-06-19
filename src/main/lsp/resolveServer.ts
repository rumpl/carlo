import { app } from 'electron';
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGE_SERVERS, type ServerLanguageId } from '@shared/language-registry';

export interface ResolvedServer {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

function exists(path: string): boolean {
  try {
    accessSync(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
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

function scriptCandidates(command: string): string[] {
  const roots = [process.cwd(), app.getAppPath(), join(process.resourcesPath ?? '', 'app.asar.unpacked')];
  if (command === 'typescript-language-server') {
    return roots.map((root) => join(root, 'node_modules', 'typescript-language-server', 'lib', 'cli.mjs'));
  }
  if (command === 'vscode-json-language-server') {
    return roots.map((root) => join(root, 'node_modules', 'vscode-langservers-extracted', 'bin', 'vscode-json-language-server'));
  }
  return [];
}

export function resolveServer(languageId: ServerLanguageId, rootUri: string): ResolvedServer {
  const server = LANGUAGE_SERVERS[languageId];
  const commandName = server.command;
  const binCandidates = [
    join(process.cwd(), 'node_modules', '.bin', binName(commandName)),
    join(app.getAppPath(), 'node_modules', '.bin', binName(commandName)),
    join(process.resourcesPath ?? '', 'app.asar.unpacked', 'node_modules', '.bin', binName(commandName)),
  ];
  const bin = binCandidates.find(canExecute);
  const cwd = rootUri.startsWith('file://') ? fileURLToPath(rootUri) : undefined;
  if (bin) return { command: bin, args: [...server.args], cwd };

  const script = scriptCandidates(commandName).find(exists);
  if (script) {
    return {
      command: process.execPath,
      args: [script, ...server.args],
      cwd,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    };
  }

  return { command: commandName, args: [...server.args], cwd };
}
