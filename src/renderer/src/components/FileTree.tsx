import { useEditorStore } from '../store/useEditorStore';
import { InlineCreateRow } from './fileTree/InlineCreateRow';
import { TreeNode } from './fileTree/TreeNode';
import { useActiveTabPath } from './fileTree/useActiveTabPath';
import { useFileTreeOperations } from './fileTree/useFileTreeOperations';
import { useInitialWorkspace } from './fileTree/useInitialWorkspace';
import { useRevealActivePath } from './fileTree/useRevealActivePath';
import { useTreeContextMenu } from './fileTree/useTreeContextMenu';
import { useWorkspaceTree } from './fileTree/useWorkspaceTree';
import { useWorkspaceWatcher } from './fileTree/useWorkspaceWatcher';

export function FileTree() {
  useInitialWorkspace();
  const workspace = useEditorStore((state) => state.workspace) ?? undefined;
  const activeTabPath = useActiveTabPath();
  const tree = useWorkspaceTree(workspace);
  const { contextMenu, openContextMenu, closeContextMenu } = useTreeContextMenu(workspace);
  const operations = useFileTreeOperations({ workspace, tree, closeContextMenu });

  useWorkspaceWatcher(workspace, tree.reloadPreservingScroll);
  useRevealActivePath({
    workspace,
    activeTabPath,
    nodes: tree.nodes,
    expandedPaths: tree.expandedPaths,
    bodyRef: tree.bodyRef,
    setExpandedPaths: tree.setExpandedPaths,
    setNodes: tree.setNodes,
  });

  return (
    <aside className="file-tree">
      <div className="file-tree-header">
        <span>{workspace?.name ?? 'Explorer'}</span>
        <div className="file-tree-header-actions">
          {workspace ? (
            <>
              <button onClick={() => tree.setExpandedPaths(new Set())} title="Collapse all">
                ⇤
              </button>
              <button onClick={() => void tree.reload().catch(console.error)} title="Refresh">
                ↻
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="file-tree-body" ref={tree.bodyRef} onContextMenu={(event) => openContextMenu(event)}>
        {tree.loading ? (
          <div className="tree-empty">Loading…</div>
        ) : (
          <ul>
            {workspace && operations.createPrompt?.parentPath === workspace.rootPath ? (
              <InlineCreateRow
                kind={operations.createPrompt.kind}
                depth={0}
                name={operations.createName}
                inputRef={operations.createInputRef}
                onChange={operations.setCreateName}
                onSubmit={(event) => void operations.submitCreate(event)}
                onCancel={operations.cancelCreate}
              />
            ) : null}
            {tree.nodes.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                activePath={activeTabPath}
                expandedPaths={tree.expandedPaths}
                onToggleDirectory={tree.toggleDirectory}
                onOpenFile={operations.openNode}
                onContextMenu={openContextMenu}
                createPrompt={operations.createPrompt}
                createName={operations.createName}
                createInputRef={operations.createInputRef}
                onCreateNameChange={operations.setCreateName}
                onCreateSubmit={(event) => void operations.submitCreate(event)}
                onCreateCancel={operations.cancelCreate}
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
          <button disabled={!contextMenu.node} onClick={() => operations.copyNode(contextMenu)}>
            Copy
          </button>
          <button disabled={!operations.clipboard} onClick={() => operations.pasteNode(contextMenu)}>
            Paste{operations.clipboard ? ` “${operations.clipboard.name}”` : ''}
          </button>
          <div className="tree-context-separator" />
          <button onClick={() => operations.startCreate(contextMenu, 'file')}>New File…</button>
          <button onClick={() => operations.startCreate(contextMenu, 'directory')}>New Folder…</button>
          <div className="tree-context-separator" />
          <button className="danger" disabled={!contextMenu.node} onClick={() => operations.deleteNode(contextMenu)}>
            Delete
          </button>
        </div>
      ) : null}
    </aside>
  );
}
