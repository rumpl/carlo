import { useEffect, useMemo, useRef, useState } from 'react';
import fuzzysort from 'fuzzysort';
import type { FileTreeNode } from '@shared/file-types';
import { languageIdFromPath } from '@shared/language-registry';
import { getOrCreateModel } from '../editor/models';
import { ensureLanguageClient } from '../lsp/LanguageClientService';
import { useEditorStore } from '../store/useEditorStore';
import { useQuickOpenStore } from '../store/useQuickOpenStore';

interface QuickOpenItem {
  name: string;
  path: string;
  uri: string;
  relativePath: string;
}

function flatten(nodes: FileTreeNode[], rootPath: string): QuickOpenItem[] {
  return nodes.flatMap((node) => {
    if (node.type === 'directory') return flatten(node.children ?? [], rootPath);
    return [
      {
        name: node.name,
        path: node.path,
        uri: node.uri,
        relativePath: node.path.startsWith(rootPath) ? node.path.slice(rootPath.length + 1) : node.path,
      },
    ];
  });
}

function titleFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function QuickOpen() {
  const { open, query, setQuery, closeQuickOpen } = useQuickOpenStore();
  const workspace = useEditorStore((state) => state.workspace);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<QuickOpenItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  async function loadFiles(): Promise<void> {
    if (!workspace) return;
    setLoading(true);
    try {
      const tree = await window.api.workspace.listTree(workspace.rootPath, {
        recursive: true,
        watch: false,
      });
      setFiles(flatten(tree.children, workspace.rootPath));
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }

  const results = useMemo(() => {
    if (!query) return files.slice(0, 100).map((file) => ({ obj: file }));
    return fuzzysort.go(query, files, { key: 'relativePath', limit: 100 });
  }, [files, query]);

  async function openFile(item: QuickOpenItem): Promise<void> {
    const languageId = languageIdFromPath(item.path);
    const file = await window.api.file.read(item.path);
    getOrCreateModel(item.uri, file.content, languageId);
    useEditorStore.getState().openFile({ uri: item.uri, path: item.path, languageId, title: titleFromPath(item.path) });
    closeQuickOpen();
    if (workspace) await ensureLanguageClient(languageId, workspace.rootUri, item.uri).catch(console.error);
  }

  useEffect(() => {
    if (!open || !workspace) return;
    void loadFiles().catch(console.error);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, workspace?.rootPath]);

  if (!open) return null;

  return (
    <div className="palette-backdrop" onMouseDown={closeQuickOpen}>
      <div className="palette" onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          autoFocus
          placeholder="Quick open file"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeQuickOpen();
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setSelected((value) => Math.min(value + 1, results.length - 1));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected((value) => Math.max(value - 1, 0));
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              const item = results[selected]?.obj;
              if (item) void openFile(item);
            }
          }}
        />
        <div className="palette-list">
          {results.map((result, index) => (
            <button
              key={result.obj.path}
              className={index === selected ? 'selected' : ''}
              onMouseEnter={() => setSelected(index)}
              onClick={() => void openFile(result.obj)}
            >
              <span>{result.obj.name}</span>
              <kbd>{result.obj.relativePath}</kbd>
            </button>
          ))}
          {loading ? <div className="tree-empty">Loading files…</div> : null}
          {!loading && results.length === 0 ? <div className="tree-empty">No files found in {workspace?.rootPath ?? 'workspace'}</div> : null}
        </div>
      </div>
    </div>
  );
}
