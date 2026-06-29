import { useEffect, useMemo, useRef, useState } from 'react';
import fuzzysort from 'fuzzysort';
import { getCommands, type Command } from '../commands/registry';
import { useCommandStore } from '../store/useCommandStore';

export function CommandPalette() {
  const { paletteOpen, query, setQuery, closePalette } = useCommandStore();
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  const commands = useMemo(() => getCommands(), [paletteOpen]);
  const matches = useMemo(
    () =>
      query
        ? fuzzysort.go(query, commands, { key: 'title', limit: 20 }).map((r) => r.obj)
        : commands.slice(0, 20),
    [query, commands],
  );
  if (!paletteOpen) return null;
  const run = async (command: Command | undefined) => {
    if (!command) return;
    closePalette();
    await command.run();
  };
  return (
    <div className="palette-backdrop">
      <div className="palette">
        <input
          autoFocus
          value={query}
          placeholder="Type a command"
          onChange={(event) => {
            setSelected(0);
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closePalette();
            if (event.key === 'ArrowDown')
              setSelected((prev) => (prev + 1) % Math.max(matches.length, 1));
            if (event.key === 'ArrowUp')
              setSelected(
                (prev) => (prev - 1 + Math.max(matches.length, 1)) % Math.max(matches.length, 1),
              );
            if (event.key === 'Enter') void run(matches[selected]);
          }}
        />
        <div className="palette-list" ref={listRef}>
          {matches.map((command, index) => (
            <button
              key={command.id}
              className={index === selected ? 'selected' : ''}
              onMouseEnter={() => setSelected(index)}
              onClick={() => void run(command)}
            >
              <span>{command.title}</span>
              <kbd>{command.keybinding}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
