import * as monaco from '@codingame/monaco-vscode-editor-api';
import { type ProblemItem, useProblemsStore } from '../store/useProblemsStore';
import { pathFromUri } from '../utils/uriUtils';

let disposable: monaco.IDisposable | undefined;

function problemSeverity(markerSeverity: monaco.MarkerSeverity): ProblemItem['severity'] {
  if (markerSeverity === monaco.MarkerSeverity.Error) return 1;
  if (markerSeverity === monaco.MarkerSeverity.Warning) return 2;
  if (markerSeverity === monaco.MarkerSeverity.Info) return 3;
  return 4;
}

function collectProblems(): ProblemItem[] {
  return monaco.editor
    .getModelMarkers({})
    .map((marker) => ({
      id: `${marker.resource.toString()}:${marker.owner}:${marker.startLineNumber}:${marker.startColumn}:${marker.endLineNumber}:${marker.endColumn}:${marker.message}`,
      uri: marker.resource.toString(),
      path: pathFromUri(marker.resource),
      owner: marker.owner,
      severity: problemSeverity(marker.severity),
      message: marker.message,
      startLineNumber: marker.startLineNumber,
      startColumn: marker.startColumn,
      endLineNumber: marker.endLineNumber,
      endColumn: marker.endColumn,
    }))
    .sort((a, b) => {
      const byPath = a.path.localeCompare(b.path);
      if (byPath !== 0) return byPath;
      return a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn || a.severity - b.severity;
    });
}

export function startProblemsSync(): void {
  if (disposable) return;
  const update = () => useProblemsStore.getState().setProblems(collectProblems());
  update();
  disposable = monaco.editor.onDidChangeMarkers(update);
}
