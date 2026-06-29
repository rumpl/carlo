import { useRef } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { setActiveEditorForGroup } from './editorRegistry';
import { useActiveEditorModel } from './useActiveEditorModel';
import { useModelDirtyTracking } from './useModelDirtyTracking';
import { useMonacoEditorInstance } from './useMonacoEditorInstance';

interface Props {
  groupId: string;
}

export function MonacoEditor({ groupId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const group = useEditorStore((state) => state.groups.find((candidate) => candidate.id === groupId));
  const markDirty = useEditorStore((state) => state.markDirty);
  const setActiveGroup = useEditorStore((state) => state.setActiveGroup);
  const editorVersion = useMonacoEditorInstance({ groupId, containerRef, setActiveGroup });

  useActiveEditorModel({ groupId, activeTabId: group?.activeTabId ?? undefined, editorVersion });
  useModelDirtyTracking({ groupId, activeTabId: group?.activeTabId ?? undefined, editorVersion, markDirty });

  return (
    <div className="editor-stack">
      <div
        className="editor-host"
        ref={containerRef}
        onMouseDownCapture={() => {
          setActiveEditorForGroup(groupId);
          setActiveGroup(groupId);
        }}
      />
    </div>
  );
}
