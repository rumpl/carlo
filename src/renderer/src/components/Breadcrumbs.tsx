import { relativePath } from '../commands/builtin/pathUtils';
import { useActiveTabInGroup, useEditorStore } from '../store/useEditorStore';

interface Props {
  groupId: string;
  compact?: boolean;
}

export function Breadcrumbs({ groupId, compact = false }: Props) {
  const tab = useActiveTabInGroup(groupId);
  const workspace = useEditorStore((state) => state.workspace);

  const className = `breadcrumbs${compact ? ' compact' : ''}`;

  if (!tab) return <div className={className} aria-hidden="true" />;

  const parts = relativePath(tab.path, workspace?.rootPath).split('/').filter(Boolean);
  const cumulativeParts = parts.map((_, i) => parts.slice(0, i + 1).join('/'));

  return (
    <nav className={className} aria-label="Breadcrumbs" title={tab.path}>
      {parts.map((part, index) => (
        <span className="breadcrumb-part" key={cumulativeParts[index]}>
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
