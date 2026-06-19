export interface Command {
  id: string;
  title: string;
  category?: string;
  keybinding?: string;
  run: () => void | Promise<void>;
}
const commands: Command[] = [];
let builtinCommandsPromise: Promise<void> | undefined;

async function ensureBuiltinCommands(): Promise<void> {
  builtinCommandsPromise ??= import('./builtinCommands').then(({ registerBuiltinCommands }) =>
    registerBuiltinCommands(),
  );
  await builtinCommandsPromise;
}
export function registerCommand(command: Command): void {
  if (!commands.some((existing) => existing.id === command.id)) commands.push(command);
}
export function getCommands(): Command[] {
  return [...commands];
}
export async function runCommand(id: string): Promise<void> {
  let command = commands.find((candidate) => candidate.id === id);
  if (!command) {
    await ensureBuiltinCommands();
    command = commands.find((candidate) => candidate.id === id);
  }
  if (command) await command.run();
}
