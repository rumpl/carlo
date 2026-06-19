import * as monaco from '@codingame/monaco-vscode-editor-api';
import type { EditorTab } from '../store/useEditorStore';

const decorationIds = new WeakMap<monaco.editor.ITextModel, string[]>();
const baselineCache = new Map<string, string | null>();

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, '\n').split('\n');
}

function changedRanges(baseContent: string, currentContent: string): monaco.editor.IModelDeltaDecoration[] {
  const base = splitLines(baseContent);
  const current = splitLines(currentContent);
  let start = 0;
  while (start < base.length && start < current.length && base[start] === current[start]) start += 1;

  let baseEnd = base.length - 1;
  let currentEnd = current.length - 1;
  while (baseEnd >= start && currentEnd >= start && base[baseEnd] === current[currentEnd]) {
    baseEnd -= 1;
    currentEnd -= 1;
  }

  const baseChanged = Math.max(0, baseEnd - start + 1);
  const currentChanged = Math.max(0, currentEnd - start + 1);
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];

  if (baseChanged === 0 && currentChanged === 0) return decorations;

  const paired = Math.min(baseChanged, currentChanged);
  for (let index = 0; index < paired; index += 1) {
    const line = start + index + 1;
    decorations.push(decoration(line, 'modified'));
  }

  for (let index = paired; index < currentChanged; index += 1) {
    const line = start + index + 1;
    decorations.push(decoration(line, 'added'));
  }

  if (baseChanged > currentChanged) {
    const line = Math.min(Math.max(start + currentChanged + 1, 1), Math.max(current.length, 1));
    decorations.push(decoration(line, 'deleted'));
  }

  return decorations;
}

function decoration(line: number, kind: 'added' | 'modified' | 'deleted'): monaco.editor.IModelDeltaDecoration {
  return {
    range: new monaco.Range(line, 1, line, 1),
    options: {
      isWholeLine: true,
      linesDecorationsClassName: `git-line-${kind}`,
    },
  };
}

async function baselineFor(tab: EditorTab): Promise<string | null> {
  if (baselineCache.has(tab.path)) return baselineCache.get(tab.path) ?? null;
  const result = await window.api.git.baseline(tab.path);
  const baseline = result.isGitRepo ? (result.content ?? '') : null;
  baselineCache.set(tab.path, baseline);
  return baseline;
}

export async function updateGitGutter(editor: monaco.editor.IStandaloneCodeEditor, tab: EditorTab): Promise<void> {
  const model = editor.getModel();
  if (!model || model.uri.toString() !== tab.uri) return;

  const baseline = await baselineFor(tab).catch((error) => {
    console.error('failed to load git baseline', error);
    return null;
  });
  if (editor.getModel() !== model) return;

  const oldDecorations = decorationIds.get(model) ?? [];
  const nextDecorations = baseline === null ? [] : changedRanges(baseline, model.getValue());
  decorationIds.set(model, model.deltaDecorations(oldDecorations, nextDecorations));
}

export function clearGitGutter(model: monaco.editor.ITextModel): void {
  const oldDecorations = decorationIds.get(model) ?? [];
  decorationIds.set(model, model.deltaDecorations(oldDecorations, []));
}

export function invalidateGitBaseline(path: string): void {
  baselineCache.delete(path);
}

export function invalidateAllGitBaselines(): void {
  baselineCache.clear();
}
