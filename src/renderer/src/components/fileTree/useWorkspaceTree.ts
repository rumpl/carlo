import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileTreeNode, WorkspaceFolderResult } from '@shared/file-types';
import { findNode, normalizePath, replaceNodeChildren } from './treeUtils';

export function useWorkspaceTree(workspace: WorkspaceFolderResult | undefined) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const expandedPathsRef = useRef<Set<string>>(new Set());
  const fullLoadRequestIdRef = useRef(0);
  const directoryRequestIdRef = useRef(0);
  const directoryRequestsRef = useRef<Map<string, number>>(new Map());
  const workspaceRootRef = useRef<string | undefined>(undefined);
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  workspaceRootRef.current = workspace ? normalizePath(workspace.rootPath) : undefined;

  const load = useCallback(
    async (
      rootPath: string,
      options: { showLoading?: boolean; preserveScroll?: boolean } = {},
    ): Promise<void> => {
      const normalizedRoot = normalizePath(rootPath);
      if (workspaceRootRef.current !== normalizedRoot) return;

      const requestId = ++fullLoadRequestIdRef.current;
      directoryRequestsRef.current.clear();
      const { showLoading = true, preserveScroll = false } = options;
      const scrollTop = preserveScroll ? bodyRef.current?.scrollTop : undefined;
      const isCurrentRequest = (): boolean =>
        fullLoadRequestIdRef.current === requestId && workspaceRootRef.current === normalizedRoot;

      setLoading(showLoading);
      try {
        let nextNodes = (await window.api.workspace.listTree(rootPath)).children;
        if (!isCurrentRequest()) return;

        const expandedDirectories = [...expandedPathsRef.current]
          .filter((path) => {
            const normalizedPath = normalizePath(path);
            return (
              normalizedPath !== normalizedRoot && normalizedPath.startsWith(`${normalizedRoot}/`)
            );
          })
          .sort((a, b) => a.length - b.length);
        for (const path of expandedDirectories) {
          if (findNode(nextNodes, path)?.type !== 'directory') continue;
          const children = (await window.api.workspace.listTree(path, { watch: false })).children;
          if (!isCurrentRequest()) return;
          nextNodes = replaceNodeChildren(nextNodes, path, children);
        }
        setNodes((currentNodes) => (isCurrentRequest() ? nextNodes : currentNodes));
        if (scrollTop !== undefined) {
          requestAnimationFrame(() => {
            if (isCurrentRequest() && bodyRef.current) bodyRef.current.scrollTop = scrollTop;
          });
        }
      } finally {
        if (showLoading) {
          setLoading((currentLoading) => (isCurrentRequest() ? false : currentLoading));
        }
      }
    },
    [],
  );

  useEffect(() => {
    expandedPathsRef.current = expandedPaths;
  }, [expandedPaths]);

  useEffect(() => {
    const nextExpandedPaths = new Set<string>();
    expandedPathsRef.current = nextExpandedPaths;
    setExpandedPaths(nextExpandedPaths);
    setNodes([]);
    if (workspace) {
      void load(workspace.rootPath).catch(console.error);
      return;
    }

    fullLoadRequestIdRef.current += 1;
    directoryRequestsRef.current.clear();
    setNodes([]);
    setLoading(false);
  }, [workspace, load]);

  const refreshDirectory = useCallback(
    async (path: string): Promise<void> => {
      if (!workspace) return;
      const normalizedRoot = normalizePath(workspace.rootPath);
      if (workspaceRootRef.current !== normalizedRoot) return;
      if (normalizePath(path) === normalizedRoot) {
        await load(workspace.rootPath);
        return;
      }

      const normalizedPath = normalizePath(path);
      fullLoadRequestIdRef.current += 1;
      setLoading(false);
      const requestId = ++directoryRequestIdRef.current;
      directoryRequestsRef.current.set(normalizedPath, requestId);
      const children = (await window.api.workspace.listTree(path, { watch: false })).children;
      setNodes((currentNodes) => {
        if (
          workspaceRootRef.current !== normalizedRoot ||
          directoryRequestsRef.current.get(normalizedPath) !== requestId
        ) {
          return currentNodes;
        }
        return replaceNodeChildren(currentNodes, path, children);
      });
    },
    [workspace, load],
  );

  const toggleDirectory = useCallback(
    async (node: FileTreeNode): Promise<void> => {
      if (!workspace) return;
      const normalizedRoot = normalizePath(workspace.rootPath);
      if (workspaceRootRef.current !== normalizedRoot) return;

      const shouldExpand = !expandedPaths.has(node.path);
      setExpandedPaths((paths) => {
        const next = new Set(paths);
        if (shouldExpand) next.add(node.path);
        else next.delete(node.path);
        return next;
      });
      if (!shouldExpand || node.children !== undefined) return;

      const normalizedPath = normalizePath(node.path);
      fullLoadRequestIdRef.current += 1;
      setLoading(false);
      const requestId = ++directoryRequestIdRef.current;
      directoryRequestsRef.current.set(normalizedPath, requestId);
      try {
        const children = (await window.api.workspace.listTree(node.path, { watch: false }))
          .children;
        setNodes((currentNodes) => {
          if (
            workspaceRootRef.current !== normalizedRoot ||
            directoryRequestsRef.current.get(normalizedPath) !== requestId
          ) {
            return currentNodes;
          }
          return replaceNodeChildren(currentNodes, node.path, children);
        });
      } catch (error) {
        console.error(error);
      }
    },
    [workspace, expandedPaths],
  );

  const ensureDirectoryLoaded = useCallback(
    async (path: string): Promise<void> => {
      if (!workspace) return;
      const normalizedRoot = normalizePath(workspace.rootPath);
      if (workspaceRootRef.current !== normalizedRoot || normalizePath(path) === normalizedRoot) {
        return;
      }
      const node = findNode(nodes, path);
      if (node?.type !== 'directory' || node.children !== undefined) return;

      const normalizedPath = normalizePath(path);
      fullLoadRequestIdRef.current += 1;
      setLoading(false);
      const requestId = ++directoryRequestIdRef.current;
      directoryRequestsRef.current.set(normalizedPath, requestId);
      const children = (await window.api.workspace.listTree(path, { watch: false })).children;
      setNodes((currentNodes) => {
        if (
          workspaceRootRef.current !== normalizedRoot ||
          directoryRequestsRef.current.get(normalizedPath) !== requestId
        ) {
          return currentNodes;
        }
        return replaceNodeChildren(currentNodes, path, children);
      });
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
