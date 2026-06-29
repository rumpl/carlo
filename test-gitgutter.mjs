/**
 * Pure-Node validation for the Myers diff logic embedded in gitGutter.ts.
 * Runs without any npm packages.
 */

// ---- Copy of the pure functions from gitGutter.ts -------------------------

function splitLines(content) {
  return content.replace(/\r\n/g, '\n').split('\n');
}

function myersDiff(a, b) {
  const N = a.length;
  const M = b.length;
  const MAX = N + M;

  if (MAX === 0) return [];

  const offset = MAX;
  const V = new Int32Array(2 * MAX + 2);
  const trace = [];

  outer: for (let d = 0; d <= MAX; d++) {
    const snap = new Int32Array(V);
    trace.push(snap);

    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && V[k - 1 + offset] < V[k + 1 + offset])) {
        x = V[k + 1 + offset];
      } else {
        x = V[k - 1 + offset] + 1;
      }
      let y = x - k;
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

  const path = [];
  let x = N;
  let y = M;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    let prevK;
    if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[prevK + offset];
    const prevY = prevX - prevK;

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

  const ops = [];
  let px = 0;
  let py = 0;

  for (const { x: nx, y: ny } of path) {
    if (nx === px && ny === py) continue;

    const dx = nx - px;
    const dy = ny - py;

    if (dx > 0 && dy > 0) {
      ops.push({ kind: 'equal', baseStart: px, baseEnd: nx - 1, currentStart: py, currentEnd: ny - 1 });
    } else if (dx > 0) {
      ops.push({ kind: 'delete', baseStart: px, baseEnd: nx - 1, currentStart: py, currentEnd: py - 1 });
    } else {
      ops.push({ kind: 'insert', baseStart: px, baseEnd: px - 1, currentStart: py, currentEnd: ny - 1 });
    }

    px = nx;
    py = ny;
  }

  const merged = [];
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
      i++;
    } else {
      merged.push(op);
    }
  }

  return merged;
}

function changedRanges(baseContent, currentContent) {
  const base = splitLines(baseContent);
  const current = splitLines(currentContent);
  const ops = myersDiff(base, current);
  const decorations = [];

  for (const op of ops) {
    if (op.kind === 'equal') continue;

    if (op.kind === 'replace') {
      const baseCount = op.baseEnd - op.baseStart + 1;
      const currentCount = op.currentEnd - op.currentStart + 1;
      const paired = Math.min(baseCount, currentCount);

      for (let i = 0; i < paired; i++) {
        decorations.push({ line: op.currentStart + i + 1, kind: 'modified' });
      }
      for (let i = paired; i < currentCount; i++) {
        decorations.push({ line: op.currentStart + i + 1, kind: 'added' });
      }
      if (baseCount > currentCount) {
        const markerLine = Math.min(
          Math.max(op.currentStart + currentCount + 1, 1),
          Math.max(current.length, 1),
        );
        decorations.push({ line: markerLine, kind: 'deleted' });
      }
    } else if (op.kind === 'insert') {
      for (let i = op.currentStart; i <= op.currentEnd; i++) {
        decorations.push({ line: i + 1, kind: 'added' });
      }
    } else if (op.kind === 'delete') {
      const markerLine = Math.min(
        Math.max(op.currentStart + 1, 1),
        Math.max(current.length, 1),
      );
      decorations.push({ line: markerLine, kind: 'deleted' });
    }
  }

  return decorations;
}

// ---- Test helpers ---------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function decoratedLines(baseContent, currentContent) {
  return changedRanges(baseContent, currentContent).map(d => d.line);
}

function decoratedKinds(baseContent, currentContent) {
  return changedRanges(baseContent, currentContent);
}

// ---- Tests ----------------------------------------------------------------

console.log('\n=== Test 1: No changes ===');
{
  const base = ['line1', 'line2', 'line3'].join('\n');
  const current = base;
  const result = changedRanges(base, current);
  assert(result.length === 0, 'No decorations when files are identical');
}

console.log('\n=== Test 2: Single contiguous modification (old behaviour still correct) ===');
{
  // Modify line 2 (0-indexed=1)
  const base = ['line1', 'line2', 'line3'].join('\n');
  const current = ['line1', 'CHANGED', 'line3'].join('\n');
  const decs = decoratedKinds(base, current);
  assert(decs.length === 1, 'Exactly 1 decoration');
  assert(decs[0].line === 2, 'Decoration on line 2');
  assert(decs[0].kind === 'modified', 'Kind is modified');
}

console.log('\n=== Test 3: TWO separate modifications (the key fix) ===');
{
  // Build a 60-line file; modify line 5 and line 50
  const lines = Array.from({ length: 60 }, (_, i) => `line${i + 1}`);
  const base = lines.join('\n');

  const modified = [...lines];
  modified[4] = 'CHANGED_LINE5';   // line 5 (1-based)
  modified[49] = 'CHANGED_LINE50'; // line 50 (1-based)
  const current = modified.join('\n');

  const decs = decoratedKinds(base, current);
  const lines1based = decs.map(d => d.line);

  assert(decs.every(d => d.kind === 'modified'), 'All decorations are "modified"');
  assert(lines1based.includes(5), 'Line 5 is decorated');
  assert(lines1based.includes(50), 'Line 50 is decorated');

  // The critical assertion: no decoration should span between 5 and 50
  const spurious = lines1based.filter(l => l > 5 && l < 50);
  assert(spurious.length === 0, `No spurious decorations between lines 5 and 50 (found: [${spurious}])`);
  assert(decs.length === 2, `Exactly 2 decorations, not one large block (found ${decs.length})`);
}

console.log('\n=== Test 4: Pure insertion ===');
{
  const base = ['line1', 'line3'].join('\n');
  const current = ['line1', 'line2', 'line3'].join('\n');
  const decs = decoratedKinds(base, current);
  assert(decs.length === 1, 'One decoration for inserted line');
  assert(decs[0].kind === 'added', 'Kind is added');
  assert(decs[0].line === 2, 'Decoration on line 2');
}

console.log('\n=== Test 5: Pure deletion ===');
{
  const base = ['line1', 'line2', 'line3'].join('\n');
  const current = ['line1', 'line3'].join('\n');
  const decs = decoratedKinds(base, current);
  assert(decs.length === 1, 'One decoration for deleted line');
  assert(decs[0].kind === 'deleted', 'Kind is deleted');
}

console.log('\n=== Test 6: Three separate hunks ===');
{
  const lines = Array.from({ length: 100 }, (_, i) => `line${i + 1}`);
  const base = lines.join('\n');

  const modified = [...lines];
  modified[9] = 'CHANGED_LINE10';   // line 10
  modified[49] = 'CHANGED_LINE50';  // line 50
  modified[89] = 'CHANGED_LINE90';  // line 90
  const current = modified.join('\n');

  const decs = decoratedKinds(base, current);
  const ls = decs.map(d => d.line);

  assert(decs.length === 3, `Exactly 3 decorations (found ${decs.length})`);
  assert(ls.includes(10), 'Line 10 decorated');
  assert(ls.includes(50), 'Line 50 decorated');
  assert(ls.includes(90), 'Line 90 decorated');
  const between = ls.filter(l => (l > 10 && l < 50) || (l > 50 && l < 90));
  assert(between.length === 0, `No spurious decorations between hunks (found: [${between}])`);
}

console.log('\n=== Test 7: Lines added at the end ===');
{
  const base = ['line1', 'line2'].join('\n');
  const current = ['line1', 'line2', 'line3', 'line4'].join('\n');
  const decs = decoratedKinds(base, current);
  assert(decs.length === 2, 'Two added decorations');
  assert(decs.every(d => d.kind === 'added'), 'All are added');
}

console.log('\n=== Test 8: Empty base (lines added) ===');
{
  // splitLines('') => [''], so base has 1 empty line.
  // line1 is a replace of that empty line → 'modified'; line2, line3 → 'added'.
  const base = '';
  const current = ['line1', 'line2', 'line3'].join('\n');
  const decs = decoratedKinds(base, current);
  // At minimum: all three current lines must be decorated
  const ls = decs.map(d => d.line);
  assert(ls.includes(1), 'Line 1 is decorated');
  assert(ls.includes(2), 'Line 2 is decorated');
  assert(ls.includes(3), 'Line 3 is decorated');
  assert(decs.length === 3, `Exactly 3 decorations (found ${decs.length})`);
}

// ---- Summary --------------------------------------------------------------
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
