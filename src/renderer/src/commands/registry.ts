export interface Command { id: string; title: string; category?: string; keybinding?: string; run: () => void | Promise<void>; }
const commands: Command[] = [];
export function registerCommand(command: Command): void { if (!commands.some((existing) => existing.id === command.id)) commands.push(command); }
export function getCommands(): Command[] { return [...commands]; }
export async function runCommand(id: string): Promise<void> { const command = commands.find((candidate) => candidate.id === id); if (command) await command.run(); }
