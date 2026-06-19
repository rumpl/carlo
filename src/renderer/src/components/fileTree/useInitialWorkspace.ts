import { useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

export function useInitialWorkspace(): void {
  useEffect(() => {
    window.api.workspace
      .currentFolder()
      .then((folder) => useEditorStore.getState().setWorkspace(folder))
      .catch(console.error);
  }, []);
}
