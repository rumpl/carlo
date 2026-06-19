import type { FormEvent, RefObject } from 'react';
import { DevIcon, iconForNode } from './icons';
import type { TreeCreatePrompt } from './types';

export function InlineCreateRow({
  kind,
  depth,
  name,
  inputRef,
  onChange,
  onSubmit,
  onCancel,
}: {
  kind: TreeCreatePrompt['kind'];
  depth: number;
  name: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (name: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const icon = iconForNode(
    { name, path: '', uri: '', type: kind === 'directory' ? 'directory' : 'file' },
    false,
  );
  return (
    <li>
      <form
        className="tree-row tree-create-row"
        style={{ paddingLeft: 8 + depth * 14 }}
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="tree-chevron" />
        <DevIcon icon={icon} />
        <input
          ref={inputRef}
          className="tree-create-input"
          value={name}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel();
          }}
          onBlur={onCancel}
          placeholder={kind === 'directory' ? 'New folder' : 'New file'}
        />
      </form>
    </li>
  );
}
