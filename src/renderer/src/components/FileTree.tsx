import { useEffect, useRef, useState } from 'react';
import { icons } from '@iconify-json/vscode-icons';
import type { IconifyIcon } from '@iconify/types';
import type { FileTreeNode } from '@shared/file-types';
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';
import { languageIdFromPath } from '@shared/language-registry';
import { getOrCreateModel } from '../editor/models';
import { ensureLanguageClient } from '../lsp/LanguageClientService';
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

function TreeNode({
  node,
  depth,
  activePath,
  expandedPaths,
  onToggleDirectory,
  onOpenFile,
}: {
  node: FileTreeNode;
  depth: number;
  activePath: string | undefined;
  expandedPaths: Set<string>;
  onToggleDirectory: (node: FileTreeNode) => void;
  onOpenFile: (node: FileTreeNode) => void;
}) {
  const expanded = expandedPaths.has(node.path);
  const isDirectory = node.type === 'directory';
  const icon = iconForNode(node, expanded);
  return (
    <li>
      <button
        className={`tree-row ${isDirectory ? 'directory' : 'file'} ${node.path === activePath ? 'active' : ''}`}
        data-tree-path={node.path}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (isDirectory ? onToggleDirectory(node) : onOpenFile(node))}
        title={node.path}
      >
        <span className="tree-chevron">{isDirectory ? (expanded ? '▾' : '▸') : ''}</span>
        <DevIcon icon={icon} />
        <span className="tree-name">{node.name}</span>
      </button>
      {isDirectory && expanded && node.children ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              expandedPaths={expandedPaths}
              onToggleDirectory={onToggleDirectory}
              onOpenFile={onOpenFile}
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

function isGitMetadataPath(path: string): boolean {
  return path.split(/[\\/]/).includes('.git');
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '');
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
  const pendingScrollPath = useRef<string | undefined>(undefined);
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  async function load(rootPath: string): Promise<void> {
    setLoading(true);
    try {
      const nextNodes = (await window.api.workspace.listTree(rootPath)).children;
      setNodes(nextNodes);
      setExpandedPaths(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    window.api.workspace
      .currentFolder()
      .then((folder) => useEditorStore.getState().setWorkspace(folder))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (workspace) void load(workspace.rootPath).catch(console.error);
  }, [workspace?.rootPath]);

  useEffect(() => {
    if (!workspace) return;
    let timer: number | undefined;
    const unsubscribe = window.api.workspace.onChanged(({ rootPath, path }) => {
      if (rootPath !== workspace.rootPath || (path && isGitMetadataPath(path))) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(workspace.rootPath).catch(console.error), 120);
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
    getOrCreateModel(node.uri, file.content, languageId);
    useEditorStore
      .getState()
      .openFile({ uri: node.uri, path: node.path, languageId, title: titleFromPath(node.path) });
    if (workspace)
      await ensureLanguageClient(languageId, workspace.rootUri, node.uri).catch(console.error);
  }

  return (
    <aside className="file-tree">
      <div className="file-tree-header">
        <span>{workspace?.name ?? 'Explorer'}</span>
        {workspace ? (
          <button onClick={() => load(workspace.rootPath)} title="Refresh">
            ↻
          </button>
        ) : null}
      </div>
      <div className="file-tree-body" ref={bodyRef}>
        {loading ? (
          <div className="tree-empty">Loading…</div>
        ) : (
          <ul>
            {nodes.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                activePath={activeTabPath}
                expandedPaths={expandedPaths}
                onToggleDirectory={toggleDirectory}
                onOpenFile={openNode}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
