import { useActiveTab } from '../../store/useEditorStore';

export function useActiveTabPath(): string | undefined {
  return useActiveTab()?.path;
}
