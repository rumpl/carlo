import type { FormEvent, MouseEvent, RefObject } from 'react';
import type { FileTreeNode, GitFileStatus } from '@shared/file-types';
import { DevIcon } from './DevIcon';
import { iconForNode } from './icons';
import { InlineCreateRow } from './InlineCreateRow';
import type { TreeCreatePrompt } from './types';

const gitStatusLabels: Record<GitFileStatus, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  ignored: 'I',
  conflict: 'C',
};

export function TreeNode({
  node,
  depth,
  activePath,
  expandedPaths,
  onToggleDirectory,
  onOpenFile,
  onContextMenu,
  createPrompt,
  createName,
  createInputRef,
  onCreateNameChange,
  onCreateSubmit,
  onCreateCancel,
}: {
  node: FileTreeNode;
  depth: number;
  activePath: string | undefined;
  expandedPaths: Set<string>;
  onToggleDirectory: (node: FileTreeNode) => void;
  onOpenFile: (node: FileTreeNode) => void;
  onContextMenu: (event: MouseEvent, node: FileTreeNode) => void;
  createPrompt: TreeCreatePrompt | undefined;
  createName: string;
  createInputRef: RefObject<HTMLInputElement | null>;
  onCreateNameChange: (name: string) => void;
  onCreateSubmit: (event: FormEvent) => void;
  onCreateCancel: () => void;
}) {
  const expanded = expandedPaths.has(node.path);
  const isDirectory = node.type === 'directory';
  const icon = iconForNode(node, expanded);
  return (
    <li>
      <button
        className={`tree-row ${isDirectory ? 'directory' : 'file'} ${node.gitStatus ? `git-${node.gitStatus}` : ''} ${node.path === activePath ? 'active' : ''}`}
        data-tree-path={node.path}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (isDirectory ? onToggleDirectory(node) : onOpenFile(node))}
        onContextMenu={(event) => onContextMenu(event, node)}
        title={node.gitStatus ? `${node.path} · ${node.gitStatus}` : node.path}
      >
        <span className="tree-chevron">{isDirectory ? (expanded ? '▾' : '▸') : ''}</span>
        <DevIcon icon={icon} />
        <span className="tree-name">{node.name}</span>
        {node.gitStatus ? <span className="tree-git-badge">{gitStatusLabels[node.gitStatus]}</span> : null}
      </button>
      {isDirectory && expanded && node.children ? (
        <ul>
          {createPrompt?.parentPath === node.path ? (
            <InlineCreateRow
              kind={createPrompt.kind}
              depth={depth + 1}
              name={createName}
              inputRef={createInputRef}
              onChange={onCreateNameChange}
              onSubmit={onCreateSubmit}
              onCancel={onCreateCancel}
            />
          ) : null}
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              expandedPaths={expandedPaths}
              onToggleDirectory={onToggleDirectory}
              onOpenFile={onOpenFile}
              onContextMenu={onContextMenu}
              createPrompt={createPrompt}
              createName={createName}
              createInputRef={createInputRef}
              onCreateNameChange={onCreateNameChange}
              onCreateSubmit={onCreateSubmit}
              onCreateCancel={onCreateCancel}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
