import type { LanguageId } from './language-registry';

export interface OpenFileResult {
  uri: string;
  path: string;
  languageId: LanguageId;
  content: string;
}

export interface ReadFileRequest {
  path: string;
}

export interface ReadFileResult {
  content: string;
}

export interface SaveFileRequest {
  path: string;
  content: string;
}

export interface SaveFileResult {
  ok: true;
}

export interface SaveAsDialogRequest {
  content: string;
  suggestedName?: string;
}

export interface SaveAsDialogResult {
  path: string;
  uri: string;
  languageId: LanguageId;
}

export interface FileCreateRequest {
  parentPath: string;
  name: string;
}

export interface FileDeleteRequest {
  path: string;
}

export interface FileCopyRequest {
  sourcePath: string;
  destinationDirectory: string;
}

export interface FileOperationResult {
  path: string;
  uri: string;
}

export interface WorkspaceFolderResult {
  rootUri: string;
  rootPath: string;
  name: string;
}

export type GitFileStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'ignored'
  | 'conflict';

export interface FileTreeNode {
  name: string;
  path: string;
  uri: string;
  type: 'file' | 'directory';
  gitStatus?: GitFileStatus;
  children?: FileTreeNode[];
}

export interface GitBaselineResult {
  isGitRepo: boolean;
  tracked: boolean;
  rootPath?: string;
  content?: string;
  error?: string;
}

export interface GitChangedFile {
  path: string;
  uri: string;
  relativePath: string;
  status: GitFileStatus;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  rootPath?: string;
  files: GitChangedFile[];
}

export interface WorkspaceSearchRequest {
  rootPath: string;
  query: string;
  maxResults?: number;
}

export interface WorkspaceSearchMatch {
  path: string;
  uri: string;
  lineNumber: number;
  column: number;
  preview: string;
  matchStart: number;
  matchEnd: number;
}

export interface WorkspaceSearchResult {
  matches: WorkspaceSearchMatch[];
  truncated: boolean;
}

export interface WorkspaceChangedEvent {
  rootPath: string;
  path?: string;
  eventType: 'rename' | 'change';
}
