import type { FormEvent, RefObject } from 'react';
import { createContext, useContext } from 'react';
import type { FileTreeNode } from '@shared/file-types';

export interface CreateContextValue {
  prompt: TreeCreatePrompt | undefined;
  name: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onNameChange: (name: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}

export const CreateContext = createContext<CreateContextValue>({
  prompt: undefined,
  name: '',
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  inputRef: { current: null },
  onNameChange: () => {},
  onSubmit: () => {},
  onCancel: () => {},
});

export function useCreateContext(): CreateContextValue {
  return useContext(CreateContext);
}

export interface TreeContextMenu {
  x: number;
  y: number;
  node?: FileTreeNode;
}

export interface TreeClipboard {
  path: string;
  type: FileTreeNode['type'];
  name: string;
}

export interface TreeCreatePrompt {
  kind: 'file' | 'directory';
  parentPath: string;
}
