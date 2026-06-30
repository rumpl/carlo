import { app } from 'electron';
import { accessSync, constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { languageServerFor, type ServerLanguageId } from '@shared/language-registry';

export interface ResolvedServer {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  debug: string;
}

function checkAccess(path: string, mode: number): boolean {
  try {
    accessSync(path, mode);
    return true;
  } catch {
    return false;
  }
}

function binName(command: string): string {
  return process.platform === 'win32' ? `${command}.cmd` : command;
}

function getScriptRoots(): string[] {
  return [
    process.cwd(),
    app.getAppPath(),
    join(process.resourcesPath ?? '', 'app.asar.unpacked'),
  ];
}

const BUNDLED_SCRIPT_PATHS: Record<string, (root: string) => string> = {
  'typescript-language-server': (root) =>
    join(root, 'node_modules', 'typescript-language-server', 'lib', 'cli.mjs'),
  'vscode-json-languageserver': (root) =>
    join(root, 'node_modules', 'vscode-json-languageserver', 'bin', 'vscode-json-languageserver'),
};

function scriptCandidates(command: string): string[] {
  const resolver = BUNDLED_SCRIPT_PATHS[command];
  if (!resolver) return [];
  return getScriptRoots().map(resolver);
}

function augmentedEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME;
  const extraPaths = [
    home ? join(home, 'go', 'bin') : undefined,
    home ? join(home, '.cargo', 'bin') : undefined,
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ].filter(Boolean) as string[];
  return { ...process.env, PATH: [...extraPaths, process.env.PATH ?? ''].join(delimiter) };
}

export function resolveServer(languageId: ServerLanguageId, rootUri: string): ResolvedServer {
  const server = languageServerFor(languageId);
  if (!server) throw new Error(`No language server configured for ${languageId}`);
  const commandName = server.command;
  const env = augmentedEnv();
  const pathCandidates = (env.PATH ?? '').split(delimiter).map((path) => join(path, binName(commandName)));
  const binCandidates = [
    join(process.cwd(), 'node_modules', '.bin', binName(commandName)),
    join(app.getAppPath(), 'node_modules', '.bin', binName(commandName)),
    join(
      process.resourcesPath ?? '',
      'app.asar.unpacked',
      'node_modules',
      '.bin',
      binName(commandName),
    ),
    ...pathCandidates,
  ];
  const bin = binCandidates.find((p) => checkAccess(p, constants.X_OK));
  const cwd = rootUri.startsWith('file://') ? fileURLToPath(rootUri) : undefined;
  const debug = `command=${commandName} cwd=${cwd ?? process.cwd()} PATH=${env.PATH}`;
  if (bin) return { command: bin, args: [...server.args], cwd, env, debug: `${debug} resolved=${bin}` };

  const script = scriptCandidates(commandName).find((p) => checkAccess(p, constants.F_OK));
  if (script) {
    return {
      command: process.execPath,
      args: [script, ...server.args],
      cwd,
      env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
      debug: `${debug} resolved=${script}`,
    };
  }

  return { command: commandName, args: [...server.args], cwd, env, debug: `${debug} resolved=<system lookup>` };
}
