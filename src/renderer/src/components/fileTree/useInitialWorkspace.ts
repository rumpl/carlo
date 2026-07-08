import { useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

export function useInitialWorkspace(): void {
  useEffect(() => {
    window.api.workspace
      .currentFolder()
      .then((folder) => useEditorStore.getState().setWorkspace(folder))
      .catch(console.error);
  }, []);

  useEffect(() => {
    let previousRootUri = useEditorStore.getState().workspace?.rootUri;
    return useEditorStore.subscribe((state) => {
      const nextRootUri = state.workspace?.rootUri;
      if (previousRootUri && nextRootUri && previousRootUri !== nextRootUri) {
        const oldRootUri = previousRootUri;
        void import('../../lsp/LanguageClientService')
          .then((service) => service.stopLanguageClientsForWorkspace(oldRootUri))
          .catch(console.error);
      }
      previousRootUri = nextRootUri;
    });
  }, []);
}
