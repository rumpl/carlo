export interface Command {
  id: string;
  title: string;
  category?: string;
  keybinding?: string;
  run: () => void | Promise<void>;
}

/** Structured representation of a parsed keybinding string. */
export interface KeyDescriptor {
  key: string;        // Normalised lowercase key name or code (e.g. "p", "f12", "space")
  useCode: boolean;   // true → match event.code instead of event.key
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

/**
 * Parse a keybinding string such as `'Ctrl+Shift+P'` into a {@link KeyDescriptor}.
 *
 * Supported modifier tokens (case-insensitive): Ctrl, Shift, Alt, Meta.
 * The final token is the key.  A few aliases are normalised:
 *   - "Space" → useCode=true, key="Space"  (event.code is used because event.key varies)
 *   - "Right" / "Left" / "Up" / "Down" → ArrowRight / ArrowLeft / ArrowUp / ArrowDown
 */
export function parseKeybinding(keybinding: string): KeyDescriptor {
  const parts = keybinding.split('+');
  let ctrl = false;
  let shift = false;
  let alt = false;
  let useCode = false;
  const keyPart = parts[parts.length - 1];

  for (const part of parts.slice(0, -1)) {
    switch (part.toLowerCase()) {
      case 'ctrl':
      case 'meta':
        ctrl = true;
        break;
      case 'shift':
        shift = true;
        break;
      case 'alt':
        alt = true;
        break;
    }
  }

  let key = keyPart;

  // Normalise arrow aliases
  if (key === 'Right') key = 'ArrowRight';
  else if (key === 'Left') key = 'ArrowLeft';
  else if (key === 'Up') key = 'ArrowUp';
  else if (key === 'Down') key = 'ArrowDown';

  // Space must be matched via event.code because event.key is ' '
  if (key.toLowerCase() === 'space') {
    useCode = true;
  }

  return { key, useCode, ctrl, shift, alt };
}

/**
 * Return true when a {@link KeyboardEvent} matches the given {@link KeyDescriptor}.
 *
 * "Ctrl" in a descriptor matches either the Ctrl or Meta (Cmd on macOS) modifier key
 * so that the same keybinding string works on both platforms.
 */
export function matchesEvent(descriptor: KeyDescriptor, event: KeyboardEvent): boolean {
  const mod = event.ctrlKey || event.metaKey;
  if (descriptor.ctrl !== mod) return false;
  if (descriptor.shift !== event.shiftKey) return false;
  if (descriptor.alt !== event.altKey) return false;

  if (descriptor.useCode) {
    return event.code.toLowerCase() === descriptor.key.toLowerCase();
  }
  // For single lowercase letters compare case-insensitively; for special keys
  // (F2, F12, ArrowRight, …) compare exactly.
  if (descriptor.key.length === 1) {
    if (event.key.toLowerCase() === descriptor.key.toLowerCase()) return true;
    // Some platforms report event.key as '+' when Ctrl+= is pressed (same physical key).
    if (descriptor.key === '=' && event.key === '+') return true;
    return false;
  }
  return event.key === descriptor.key;
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

export async function ensureCommandsLoaded(): Promise<void> {
  await ensureBuiltinCommands();
}

export async function runCommand(id: string): Promise<void> {
  let command = commands.find((candidate) => candidate.id === id);
  if (!command) {
    await ensureBuiltinCommands();
    command = commands.find((candidate) => candidate.id === id);
  }
  if (command) await command.run();
}
