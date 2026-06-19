import { useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { FileTreeNode, WorkspaceFolderResult } from '@shared/file-types';
import { ancestorDirectories, findNode, replaceNodeChildren } from './treeUtils';

export function useRevealActivePath({
  workspace,
  activeTabPath,
  nodes,
  expandedPaths,
  bodyRef,
  setExpandedPaths,
  setNodes,
}: {
  workspace: WorkspaceFolderResult | undefined;
  activeTabPath: string | undefined;
  nodes: FileTreeNode[];
  expandedPaths: Set<string>;
  bodyRef: RefObject<HTMLDivElement | null>;
  setExpandedPaths: Dispatch<SetStateAction<Set<string>>>;
  setNodes: Dispatch<SetStateAction<FileTreeNode[]>>;
}): void {
  const pendingScrollPath = useRef<string | undefined>(undefined);

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
  }, [activeTabPath, workspace, nodes, setExpandedPaths, setNodes]);

  useEffect(() => {
    if (!activeTabPath || pendingScrollPath.current !== activeTabPath) return;
    const handle = window.setTimeout(() => {
      const row = [...(bodyRef.current?.querySelectorAll<HTMLElement>('[data-tree-path]') ?? [])].find(
        (element) => element.dataset.treePath === activeTabPath,
      );
      if (!row) return;
      row.scrollIntoView({ block: 'nearest' });
      pendingScrollPath.current = undefined;
    }, 0);
    return () => window.clearTimeout(handle);
  }, [activeTabPath, expandedPaths, nodes, bodyRef]);
}
