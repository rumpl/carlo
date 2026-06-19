import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
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
  setExpandedPaths,
  onOpenFile,
}: {
  node: FileTreeNode;
  depth: number;
  activePath: string | undefined;
  expandedPaths: Set<string>;
  setExpandedPaths: Dispatch<SetStateAction<Set<string>>>;
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
        onClick={() =>
          isDirectory
            ? setExpandedPaths((paths) => {
                const next = new Set(paths);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              })
            : onOpenFile(node)
        }
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
              setExpandedPaths={setExpandedPaths}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function initiallyExpanded(nodes: FileTreeNode[]): Set<string> {
  return new Set(nodes.filter((node) => node.type === 'directory').map((node) => node.path));
}

function ancestorDirectories(
  nodes: FileTreeNode[],
  targetPath: string,
  ancestors: string[] = [],
): string[] | undefined {
  for (const node of nodes) {
    if (node.path === targetPath) return ancestors;
    if (node.type !== 'directory') continue;
    const found = ancestorDirectories(node.children ?? [], targetPath, [...ancestors, node.path]);
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
      setExpandedPaths((paths) => new Set([...initiallyExpanded(nextNodes), ...paths]));
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
    if (!activeTabPath) return;
    pendingScrollPath.current = activeTabPath;
    const ancestors = ancestorDirectories(nodes, activeTabPath);
    if (!ancestors) return;
    setExpandedPaths((paths) => new Set([...paths, ...ancestors]));
  }, [activeTabPath, nodes]);

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
                setExpandedPaths={setExpandedPaths}
                onOpenFile={openNode}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
