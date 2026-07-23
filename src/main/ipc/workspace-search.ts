import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import type {
  WorkspaceSearchMatch,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
} from '@shared/file-types';
import { ignoredNames, isIgnoredPath } from './ignored-paths';

const execFileAsync = promisify(execFile);

interface RgJsonMatch {
  type: 'match' | string;
  data?: {
    path?: { text?: string };
    lines?: { text?: string };
    line_number?: number;
    submatches?: { start: number; end: number }[];
  };
}

function matchResult(
  path: string,
  lineNumber: number,
  column: number,
  preview: string,
  matchStart: number,
  matchEnd: number,
): WorkspaceSearchMatch {
  return { path, uri: pathToFileURL(path).toString(), lineNumber, column, preview, matchStart, matchEnd };
}

function parseRipgrepJson(output: string, maxResults: number): WorkspaceSearchResult {
  const matches: WorkspaceSearchMatch[] = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    let event: RgJsonMatch;
    try {
      event = JSON.parse(line) as RgJsonMatch;
    } catch {
      continue;
    }
    if (event.type !== 'match' || !event.data) continue;
    const path = event.data.path?.text;
    const preview = event.data.lines?.text?.replace(/\r?\n$/, '');
    const lineNumber = event.data.line_number;
    if (!path || !preview || !lineNumber) continue;
    for (const submatch of event.data.submatches ?? []) {
      matches.push(matchResult(path, lineNumber, submatch.start + 1, preview, submatch.start, submatch.end));
      if (matches.length >= maxResults) return { matches, truncated: true };
    }
  }
  return { matches, truncated: false };
}

async function searchWithRipgrep({
  rootPath,
  query,
  maxResults = 500,
}: WorkspaceSearchRequest & { rootPath: string }): Promise<WorkspaceSearchResult> {
  const ignoredGlob = `!{${[...ignoredNames].join(',')}}/**`;
  const args = [
    '--json',
    '--smart-case',
    '--fixed-strings',
    '--color',
    'never',
    '--glob',
    ignoredGlob,
    '--',
    query,
    rootPath,
  ];
  try {
    const { stdout } = await execFileAsync('rg', args, {
      cwd: rootPath,
      maxBuffer: 24 * 1024 * 1024,
    });
    return parseRipgrepJson(stdout, maxResults);
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException & { stdout?: string };
    if (maybeError.stdout) return parseRipgrepJson(maybeError.stdout, maxResults);
    if (maybeError.code === 'ENOENT') throw maybeError;
    throw error;
  }
}

async function searchFallback(rootPath: string, query: string, maxResults: number): Promise<WorkspaceSearchResult> {
  const matches: WorkspaceSearchMatch[] = [];
  const isSmartCaseSensitive = query !== query.toLowerCase();
  const needle = isSmartCaseSensitive ? query : query.toLowerCase();

  async function walk(path: string): Promise<void> {
    if (matches.length >= maxResults || isIgnoredPath(path, ignoredNames)) return;
    const stats = await stat(path).catch(() => undefined);
    if (!stats) return;
    if (stats.isDirectory()) {
      const entries = await readdir(path).catch(() => []);
      for (const entry of entries) await walk(join(path, entry));
      return;
    }
    if (!stats.isFile() || stats.size > 1024 * 1024) return;
    const content = await readFile(path, 'utf8').catch(() => undefined);
    if (content === undefined || content.includes('\0')) return;
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length && matches.length < maxResults; index += 1) {
      const preview = lines[index]!;
      const haystack = isSmartCaseSensitive ? preview : preview.toLowerCase();
      let columnIndex = haystack.indexOf(needle);
      while (columnIndex !== -1 && matches.length < maxResults) {
        matches.push(matchResult(path, index + 1, columnIndex + 1, preview, columnIndex, columnIndex + query.length));
        columnIndex = haystack.indexOf(needle, columnIndex + query.length);
      }
    }
  }

  await walk(rootPath);
  return { matches, truncated: matches.length >= maxResults };
}

export async function searchWorkspace(
  rootPath: string,
  request: WorkspaceSearchRequest,
): Promise<WorkspaceSearchResult> {
  const query = request.query.trim();
  const maxResults = Math.min(Math.max(request.maxResults ?? 500, 1), 2000);
  if (!query) return { matches: [], truncated: false };
  try {
    return await searchWithRipgrep({ ...request, rootPath, query, maxResults });
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;
    if (maybeError.code !== 'ENOENT') console.error('workspace search failed, falling back', error);
    return searchFallback(rootPath, query, maxResults);
  }
}
