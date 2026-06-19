import { useEffect, useRef, useState } from 'react';
import { icons } from '@iconify-json/vscode-icons';
import type { IconifyIcon } from '@iconify/types';
import type { FileTreeNode, GitFileStatus } from '@shared/file-types';
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';
import { languageIdFromPath } from '@shared/language-registry';
import { useEditorStore } from '../store/useEditorStore';

function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function iconNameFromFileName(fileName: string): string {
  return fileName.replace(/\.svg$/, '').replaceAll('_', '-');
}

function iconForNode(node: FileTreeNode, expanded: boolean): IconifyIcon {
  const fileName =
    node.type === 'directory'
      ? expanded
        ? getIconForOpenFolder(node.name)
        : getIconForFolder(node.name)
      : (getIconForFile(node.name) ?? 'default_file.svg');
  return icons.icons[iconNameFromFileName(fileName)] ?? icons.icons['default-file']!;
}

function DevIcon({ icon }: { icon: IconifyIcon }) {
  return (
    <span
      className="tree-devicon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 ${icon.width ?? icons.width ?? 16} ${icon.height ?? icons.height ?? 16}" width="16" height="16">${icon.body}</svg>`,
      }}
    />
  );
}

const gitStatusLabels: Record<GitFileStatus, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  ignored: 'I',
  conflict: 'C',
};

interface TreeContextMenu {
  x: number;
  y: number;
  node?: FileTreeNode;
}

interface TreeClipboard {
  path: string;
  type: FileTreeNode['type'];
  name: string;
}

interface TreeCreatePrompt {
  kind: 'file' | 'directory';
  parentPath: string;
}

function InlineCreateRow({
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
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (name: string) => void;
  onSubmit: (event: React.FormEvent) => void;
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

function TreeNode({
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
  onContextMenu: (event: React.MouseEvent, node: FileTreeNode) => void;
  createPrompt: TreeCreatePrompt | undefined;
  createName: string;
  createInputRef: React.RefObject<HTMLInputElement | null>;
  onCreateNameChange: (name: string) => void;
  onCreateSubmit: (event: React.FormEvent) => void;
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

function replaceNodeChildren(
  nodes: FileTreeNode[],
  targetPath: string,
  children: FileTreeNode[],
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) return { ...node, children };
    if (node.type !== 'directory' || !node.children) return node;
    return { ...node, children: replaceNodeChildren(node.children, targetPath, children) };
  });
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '');
}

function parentDirectory(path: string): string {
  return path.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '');
}

function hasValidChildName(name: string): boolean {
  return Boolean(name) && name !== '.' && name !== '..' && !/[\\/]/.test(name);
}

function ancestorDirectories(rootPath: string, targetPath: string): string[] {
  const normalizedRoot = normalizePath(rootPath);
  const normalizedTarget = normalizePath(targetPath);
  if (
    normalizedTarget === normalizedRoot ||
    !normalizedTarget.startsWith(`${normalizedRoot}/`)
  ) {
    return [];
  }

  const separator = rootPath.includes('\\') ? '\\' : '/';
  const root = rootPath.replace(/[\\/]+$/, '');
  const relativeParts = normalizedTarget.slice(normalizedRoot.length + 1).split('/');
  const directoryParts = relativeParts.slice(0, -1);
  const ancestors: string[] = [];
  let current = root;
  for (const part of directoryParts) {
    current = `${current}${separator}${part}`;
    ancestors.push(current);
  }
  return ancestors;
}

function findNode(nodes: FileTreeNode[], targetPath: string): FileTreeNode | undefined {
  const normalizedTarget = normalizePath(targetPath);
  for (const node of nodes) {
    if (normalizePath(node.path) === normalizedTarget) return node;
    if (node.type !== 'directory' || !node.children) continue;
    const found = findNode(node.children, targetPath);
    if (found) return found;
  }
  return undefined;
}

export function FileTree() {
  const workspace = useEditorStore((state) => state.workspace);
  const activeTabPath = useEditorStore(
    (state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.path,
  );
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const pendingScrollPath = useRef<string | undefined>(undefined);
  const expandedPathsRef = useRef<Set<string>>(new Set());
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<TreeContextMenu | undefined>(undefined);
  const [clipboard, setClipboard] = useState<TreeClipboard | undefined>(undefined);
  const [createPrompt, setCreatePrompt] = useState<TreeCreatePrompt | undefined>(undefined);
  const [createName, setCreateName] = useState('');

  async function load(
    rootPath: string,
    options: { showLoading?: boolean; preserveScroll?: boolean } = {},
  ): Promise<void> {
    const { showLoading = true, preserveScroll = false } = options;
    const scrollTop = preserveScroll ? bodyRef.current?.scrollTop : undefined;
    if (showLoading) setLoading(true);
    try {
      let nextNodes = (await window.api.workspace.listTree(rootPath)).children;
      const normalizedRoot = normalizePath(rootPath);
      const expandedDirectories = [...expandedPathsRef.current]
        .filter((path) => {
          const normalizedPath = normalizePath(path);
          return normalizedPath !== normalizedRoot && normalizedPath.startsWith(`${normalizedRoot}/`);
        })
        .sort((a, b) => a.length - b.length);
      for (const path of expandedDirectories) {
        if (findNode(nextNodes, path)?.type !== 'directory') continue;
        const children = (await window.api.workspace.listTree(path, { watch: false })).children;
        nextNodes = replaceNodeChildren(nextNodes, path, children);
      }
      setNodes(nextNodes);
      if (scrollTop !== undefined) {
        requestAnimationFrame(() => {
          if (bodyRef.current) bodyRef.current.scrollTop = scrollTop;
        });
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    expandedPathsRef.current = expandedPaths;
  }, [expandedPaths]);

  useEffect(() => {
    window.api.workspace
      .currentFolder()
      .then((folder) => useEditorStore.getState().setWorkspace(folder))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!workspace) return;
    setExpandedPaths(new Set());
    void load(workspace.rootPath).catch(console.error);
  }, [workspace?.rootPath]);

  useEffect(() => {
    if (!workspace) return;
    let timer: number | undefined;
    const unsubscribe = window.api.workspace.onChanged(({ rootPath }) => {
      if (rootPath !== workspace.rootPath) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(
        () =>
          void load(workspace.rootPath, {
            showLoading: false,
            preserveScroll: true,
          }).catch(console.error),
        120,
      );
    });
    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [workspace?.rootPath]);

  useEffect(() => {
    if (!activeTabPath || !workspace) return;
    pendingScrollPath.current = activeTabPath;
    const ancestors = ancestorDirectories(workspace.rootPath, activeTabPath);
    setExpandedPaths((paths) => {
      let changed = false;
      const next = new Set(paths);
      for (const ancestor of ancestors) {
        if (next.has(ancestor)) continue;
        next.add(ancestor);
        changed = true;
      }
      return changed ? next : paths;
    });

    const unloadedAncestor = ancestors.find((ancestor) => {
      const node = findNode(nodes, ancestor);
      return node?.type === 'directory' && node.children === undefined;
    });
    if (!unloadedAncestor) return;

    let cancelled = false;
    window.api.workspace
      .listTree(unloadedAncestor, { watch: false })
      .then(({ children }) => {
        if (!cancelled) {
          setNodes((currentNodes) => replaceNodeChildren(currentNodes, unloadedAncestor, children));
        }
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [activeTabPath, workspace, nodes]);

  useEffect(() => {
    if (!activeTabPath || pendingScrollPath.current !== activeTabPath) return;
    const handle = window.setTimeout(() => {
      const row = [
        ...(bodyRef.current?.querySelectorAll<HTMLElement>('[data-tree-path]') ?? []),
      ].find((element) => element.dataset.treePath === activeTabPath);
      if (!row) return;
      row.scrollIntoView({ block: 'nearest' });
      pendingScrollPath.current = undefined;
    }, 0);
    return () => window.clearTimeout(handle);
  }, [activeTabPath, expandedPaths, nodes]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(undefined);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!createPrompt) return;
    const handle = window.setTimeout(() => createInputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [createPrompt]);

  async function refreshDirectory(path: string): Promise<void> {
    if (!workspace) return;
    if (normalizePath(path) === normalizePath(workspace.rootPath)) {
      await load(workspace.rootPath);
      return;
    }
    const children = (await window.api.workspace.listTree(path, { watch: false })).children;
    setNodes((currentNodes) => replaceNodeChildren(currentNodes, path, children));
  }

  async function toggleDirectory(node: FileTreeNode): Promise<void> {
    const shouldExpand = !expandedPaths.has(node.path);
    setExpandedPaths((paths) => {
      const next = new Set(paths);
      if (shouldExpand) next.add(node.path);
      else next.delete(node.path);
      return next;
    });
    if (!shouldExpand || node.children !== undefined) return;

    try {
      const children = (await window.api.workspace.listTree(node.path, { watch: false })).children;
      setNodes((currentNodes) => replaceNodeChildren(currentNodes, node.path, children));
    } catch (error) {
      console.error(error);
    }
  }

  async function openNode(node: FileTreeNode): Promise<void> {
    const languageId = languageIdFromPath(node.path);
    const file = await window.api.file.read(node.path);
    const { getOrCreateModel } = await import('../editor/models');
    getOrCreateModel(node.uri, file.content, languageId);
    useEditorStore
      .getState()
      .openFile({ uri: node.uri, path: node.path, languageId, title: titleFromPath(node.path) });
    if (workspace) {
      const { ensureLanguageClient } = await import('../lsp/LanguageClientService');
      await ensureLanguageClient(languageId, workspace.rootUri, node.uri).catch(console.error);
    }
  }

  function targetDirectory(menu: TreeContextMenu): string | undefined {
    if (!workspace) return undefined;
    if (!menu.node) return workspace.rootPath;
    return menu.node.type === 'directory' ? menu.node.path : parentDirectory(menu.node.path);
  }

  function openContextMenu(event: React.MouseEvent, node?: FileTreeNode): void {
    if (!workspace) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }

  async function runFileOperation(operation: () => Promise<void>): Promise<void> {
    setContextMenu(undefined);
    try {
      await operation();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'File operation failed');
    }
  }

  async function ensureDirectoryLoaded(path: string): Promise<void> {
    if (!workspace || normalizePath(path) === normalizePath(workspace.rootPath)) return;
    const node = findNode(nodes, path);
    if (node?.type !== 'directory' || node.children !== undefined) return;
    const children = (await window.api.workspace.listTree(path, { watch: false })).children;
    setNodes((currentNodes) => replaceNodeChildren(currentNodes, path, children));
  }

  function startCreate(menu: TreeContextMenu, kind: TreeCreatePrompt['kind']): void {
    const parentPath = targetDirectory(menu);
    if (!parentPath) return;
    setContextMenu(undefined);
    setCreateName('');
    setExpandedPaths((paths) => new Set(paths).add(parentPath));
    void ensureDirectoryLoaded(parentPath).catch(console.error);
    setCreatePrompt({ kind, parentPath });
  }

  async function submitCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!createPrompt) return;

    const trimmedName = createName.trim();
    if (!hasValidChildName(trimmedName)) {
      window.alert(`Please enter a valid ${createPrompt.kind === 'directory' ? 'folder' : 'file'} name.`);
      return;
    }

    try {
      if (createPrompt.kind === 'directory') {
        await window.api.file.createDirectory({ parentPath: createPrompt.parentPath, name: trimmedName });
      } else {
        await window.api.file.create({ parentPath: createPrompt.parentPath, name: trimmedName });
      }
      setExpandedPaths((paths) => new Set(paths).add(createPrompt.parentPath));
      await refreshDirectory(createPrompt.parentPath);
      setCreatePrompt(undefined);
      setCreateName('');
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'File operation failed');
    }
  }

  function copyNode(menu: TreeContextMenu): void {
    if (!menu.node) return;
    setClipboard({ path: menu.node.path, type: menu.node.type, name: menu.node.name });
    setContextMenu(undefined);
  }

  function pasteNode(menu: TreeContextMenu): void {
    const parentPath = targetDirectory(menu);
    if (!clipboard || !parentPath) return;
    void runFileOperation(async () => {
      await window.api.file.copy({ sourcePath: clipboard.path, destinationDirectory: parentPath });
      setExpandedPaths((paths) => new Set(paths).add(parentPath));
      await refreshDirectory(parentPath);
    });
  }

  function deleteNode(menu: TreeContextMenu): void {
    if (!menu.node) return;
    const parentPath = parentDirectory(menu.node.path);
    const kind = menu.node.type === 'directory' ? 'folder' : 'file';
    if (!window.confirm(`Delete ${kind} “${menu.node.name}”?`)) return;
    void runFileOperation(async () => {
      await window.api.file.delete({ path: menu.node!.path });
      await refreshDirectory(parentPath);
    });
  }

  return (
    <aside className="file-tree">
      <div className="file-tree-header">
        <span>{workspace?.name ?? 'Explorer'}</span>
        <div className="file-tree-header-actions">
          {workspace ? (
            <>
              <button onClick={() => setExpandedPaths(new Set())} title="Collapse all">
                ⇤
              </button>
              <button onClick={() => load(workspace.rootPath)} title="Refresh">
                ↻
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="file-tree-body" ref={bodyRef} onContextMenu={(event) => openContextMenu(event)}>
        {loading ? (
          <div className="tree-empty">Loading…</div>
        ) : (
          <ul>
            {workspace && createPrompt?.parentPath === workspace.rootPath ? (
              <InlineCreateRow
                kind={createPrompt.kind}
                depth={0}
                name={createName}
                inputRef={createInputRef}
                onChange={setCreateName}
                onSubmit={(event) => void submitCreate(event)}
                onCancel={() => setCreatePrompt(undefined)}
              />
            ) : null}
            {nodes.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                activePath={activeTabPath}
                expandedPaths={expandedPaths}
                onToggleDirectory={toggleDirectory}
                onOpenFile={openNode}
                onContextMenu={openContextMenu}
                createPrompt={createPrompt}
                createName={createName}
                createInputRef={createInputRef}
                onCreateNameChange={setCreateName}
                onCreateSubmit={(event) => void submitCreate(event)}
                onCreateCancel={() => setCreatePrompt(undefined)}
              />
            ))}
          </ul>
        )}
      </div>
      {contextMenu ? (
        <div
          className="tree-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button disabled={!contextMenu.node} onClick={() => copyNode(contextMenu)}>
            Copy
          </button>
          <button disabled={!clipboard} onClick={() => pasteNode(contextMenu)}>
            Paste{clipboard ? ` “${clipboard.name}”` : ''}
          </button>
          <div className="tree-context-separator" />
          <button onClick={() => startCreate(contextMenu, 'file')}>New File…</button>
          <button onClick={() => startCreate(contextMenu, 'directory')}>New Folder…</button>
          <div className="tree-context-separator" />
          <button className="danger" disabled={!contextMenu.node} onClick={() => deleteNode(contextMenu)}>
            Delete
          </button>
        </div>
      ) : null}
    </aside>
  );
}
