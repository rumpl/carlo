import { useEditorStore } from '../store/useEditorStore';

interface Props {
  groupId: string;
  compact?: boolean;
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/');
}

function relativePath(path: string, rootPath: string | undefined): string {
  if (!rootPath) return path;
  const normalizedRoot = normalizePath(rootPath).replace(/\/+$/, '');
  const normalizedPath = normalizePath(path);
  return normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : path;
}

export function Breadcrumbs({ groupId, compact = false }: Props) {
  const tab = useEditorStore((state) => {
    const activeTabId = state.groups.find((group) => group.id === groupId)?.activeTabId;
    return state.tabs.find((candidate) => candidate.id === activeTabId);
  });
  const workspace = useEditorStore((state) => state.workspace);

  const className = `breadcrumbs${compact ? ' compact' : ''}`;

  if (!tab) return <div className={className} aria-hidden="true" />;

  const parts = relativePath(tab.path, workspace?.rootPath).split('/').filter(Boolean);

  return (
    <nav className={className} aria-label="Breadcrumbs" title={tab.path}>
      {parts.map((part, index) => (
        <span className="breadcrumb-part" key={`${part}:${index}`}>
          <span className={index === parts.length - 1 ? 'breadcrumb-current' : undefined}>
            {part}
          </span>
          {index < parts.length - 1 ? (
            <span className="breadcrumb-separator" aria-hidden="true">
              ›
            </span>
          ) : null}
        </span>
      ))}
    </nav>
  );
}
