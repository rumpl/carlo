import { relativePath } from '../commands/builtin/pathUtils';
import { useEditorStore } from '../store/useEditorStore';

interface Props {
  groupId: string;
  compact?: boolean;
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
