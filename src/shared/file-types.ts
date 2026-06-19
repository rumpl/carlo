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

export interface WorkspaceFolderResult {
  rootUri: string;
  rootPath: string;
  name: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  uri: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

export interface GitBaselineResult {
  isGitRepo: boolean;
  tracked: boolean;
  rootPath?: string;
  content?: string;
  error?: string;
}
