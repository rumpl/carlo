import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileTreeNode, WorkspaceFolderResult } from '@shared/file-types';
import { findNode, normalizePath, replaceNodeChildren } from './treeUtils';

export function useWorkspaceTree(workspace: WorkspaceFolderResult | undefined) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const expandedPathsRef = useRef<Set<string>>(new Set());
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (
      rootPath: string,
      options: { showLoading?: boolean; preserveScroll?: boolean } = {},
    ): Promise<void> => {
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
    },
    [],
  );

  useEffect(() => {
    expandedPathsRef.current = expandedPaths;
  }, [expandedPaths]);

  useEffect(() => {
    if (!workspace) return;
    setExpandedPaths(new Set());
    void load(workspace.rootPath).catch(console.error);
  }, [workspace, load]);

  const refreshDirectory = useCallback(
    async (path: string): Promise<void> => {
      if (!workspace) return;
      if (normalizePath(path) === normalizePath(workspace.rootPath)) {
        await load(workspace.rootPath);
        return;
      }
      const children = (await window.api.workspace.listTree(path, { watch: false })).children;
      setNodes((currentNodes) => replaceNodeChildren(currentNodes, path, children));
    },
    [workspace, load],
  );

  const toggleDirectory = useCallback(
    async (node: FileTreeNode): Promise<void> => {
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
    },
    [expandedPaths],
  );

  const ensureDirectoryLoaded = useCallback(
    async (path: string): Promise<void> => {
      if (!workspace || normalizePath(path) === normalizePath(workspace.rootPath)) return;
      const node = findNode(nodes, path);
      if (node?.type !== 'directory' || node.children !== undefined) return;
      const children = (await window.api.workspace.listTree(path, { watch: false })).children;
      setNodes((currentNodes) => replaceNodeChildren(currentNodes, path, children));
    },
    [workspace, nodes],
  );

  const expandPath = useCallback((path: string): void => {
    setExpandedPaths((paths) => new Set(paths).add(path));
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    if (workspace) await load(workspace.rootPath);
  }, [workspace, load]);

  const reloadPreservingScroll = useCallback(async (): Promise<void> => {
    if (workspace) await load(workspace.rootPath, { showLoading: false, preserveScroll: true });
  }, [workspace, load]);

  return {
    bodyRef,
    nodes,
    setNodes,
    expandedPaths,
    setExpandedPaths,
    loading,
    load,
    reload,
    reloadPreservingScroll,
    refreshDirectory,
    toggleDirectory,
    ensureDirectoryLoaded,
    expandPath,
  };
}
