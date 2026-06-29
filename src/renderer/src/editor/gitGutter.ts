import * as monaco from '@codingame/monaco-vscode-editor-api';
import type { EditorTab } from '../store/useEditorStore';

const decorationIds = new WeakMap<monaco.editor.ITextModel, string[]>();
const baselineCache = new Map<string, string | null>();

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, '\n').split('\n');
}

// ---------------------------------------------------------------------------
// Myers diff – produces an array of edit-script operations at the line level.
// Each operation is one of:
//   { kind: 'equal',   baseStart, baseEnd, currentStart, currentEnd }
//   { kind: 'replace', baseStart, baseEnd, currentStart, currentEnd }
//   { kind: 'insert',  baseStart, baseEnd, currentStart, currentEnd }
//   { kind: 'delete',  baseStart, baseEnd, currentStart, currentEnd }
//
// All indices are inclusive, 0-based.
// ---------------------------------------------------------------------------

interface DiffOp {
  kind: 'equal' | 'replace' | 'insert' | 'delete';
  /** first affected line in base (0-based) */
  baseStart: number;
  /** last affected line in base (0-based, inclusive); equal to baseStart-1 for pure inserts */
  baseEnd: number;
  /** first affected line in current (0-based) */
  currentStart: number;
  /** last affected line in current (0-based, inclusive); equal to currentStart-1 for pure deletes */
  currentEnd: number;
}

/**
 * Compute the shortest-edit-script between `a` and `b` using Myers' algorithm.
 * Returns a list of DiffOp entries covering the whole files.
 */
function myersDiff(a: string[], b: string[]): DiffOp[] {
  const N = a.length;
  const M = b.length;
  const MAX = N + M;

  if (MAX === 0) return [];

  // V[k] stores the furthest-reaching x for diagonal k
  // We use an offset so that negative k values map to positive indices.
  const offset = MAX;
  const V = new Int32Array(2 * MAX + 2);

  // trace[d] = snapshot of V after d edits
  const trace: Int32Array[] = [];

  outer: for (let d = 0; d <= MAX; d++) {
    const snap = new Int32Array(V);
    trace.push(snap);

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && V[k - 1 + offset] < V[k + 1 + offset])) {
        x = V[k + 1 + offset]; // move down (insert from b)
      } else {
        x = V[k - 1 + offset] + 1; // move right (delete from a)
      }
      let y = x - k;
      // extend along the diagonal (equal lines)
      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
      }
      V[k + offset] = x;
      if (x >= N && y >= M) {
        trace.push(new Int32Array(V));
        break outer;
      }
    }
  }

  // Back-track through the trace to reconstruct the edit path
  const path: Array<{ x: number; y: number }> = [];
  let x = N;
  let y = M;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    let prevK: number;
    if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[prevK + offset];
    const prevY = prevX - prevK;

    // snake (equal) from (prevX,prevY) diagonally to where the edit started
    while (x > prevX && y > prevY) {
      path.push({ x, y });
      x--;
      y--;
    }

    if (d > 0) {
      path.push({ x, y });
      x = prevX;
      y = prevY;
    }
  }
  path.push({ x: 0, y: 0 });
  path.reverse();

  // Convert path to operations
  const ops: DiffOp[] = [];
  let px = 0;
  let py = 0;

  for (const { x: nx, y: ny } of path) {
    if (nx === px && ny === py) continue;

    const dx = nx - px;
    const dy = ny - py;

    if (dx > 0 && dy > 0) {
      // diagonal – equal lines
      ops.push({ kind: 'equal', baseStart: px, baseEnd: nx - 1, currentStart: py, currentEnd: ny - 1 });
    } else if (dx > 0) {
      // move right – delete lines from base
      ops.push({ kind: 'delete', baseStart: px, baseEnd: nx - 1, currentStart: py, currentEnd: py - 1 });
    } else {
      // move down – insert lines from current
      ops.push({ kind: 'insert', baseStart: px, baseEnd: px - 1, currentStart: py, currentEnd: ny - 1 });
    }

    px = nx;
    py = ny;
  }

  // Merge adjacent delete+insert into replace
  const merged: DiffOp[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.kind === 'delete' && i + 1 < ops.length && ops[i + 1].kind === 'insert') {
      const next = ops[i + 1];
      merged.push({
        kind: 'replace',
        baseStart: op.baseStart,
        baseEnd: op.baseEnd,
        currentStart: next.currentStart,
        currentEnd: next.currentEnd,
      });
      i++; // skip the insert
    } else {
      merged.push(op);
    }
  }

  return merged;
}

function changedRanges(baseContent: string, currentContent: string): monaco.editor.IModelDeltaDecoration[] {
  const base = splitLines(baseContent);
  const current = splitLines(currentContent);
  const ops = myersDiff(base, current);
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];

  for (const op of ops) {
    if (op.kind === 'equal') continue;

    if (op.kind === 'replace') {
      // Pair up modified lines, then handle any surplus as added/deleted
      const baseCount = op.baseEnd - op.baseStart + 1;
      const currentCount = op.currentEnd - op.currentStart + 1;
      const paired = Math.min(baseCount, currentCount);

      for (let i = 0; i < paired; i++) {
        decorations.push(decoration(op.currentStart + i + 1, 'modified'));
      }

      // More lines in current → added
      for (let i = paired; i < currentCount; i++) {
        decorations.push(decoration(op.currentStart + i + 1, 'added'));
      }

      // More lines in base → deleted marker after the last surviving current line
      if (baseCount > currentCount) {
        const markerLine = Math.min(
          Math.max(op.currentStart + currentCount + 1, 1),
          Math.max(current.length, 1),
        );
        decorations.push(decoration(markerLine, 'deleted'));
      }
    } else if (op.kind === 'insert') {
      for (let i = op.currentStart; i <= op.currentEnd; i++) {
        decorations.push(decoration(i + 1, 'added'));
      }
    } else if (op.kind === 'delete') {
      // Mark deletion on the line that comes after the deleted block in current
      const markerLine = Math.min(
        Math.max(op.currentStart + 1, 1),
        Math.max(current.length, 1),
      );
      decorations.push(decoration(markerLine, 'deleted'));
    }
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
