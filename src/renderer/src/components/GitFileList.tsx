import type { GitChangedFile, GitFileStatus } from '@shared/file-types';
import { openGitChanges } from '../git/diffTabs';
import { directoryFromRelativePath, titleFromPath } from '../commands/builtin/pathUtils';

const statusLabels: Record<GitFileStatus, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  ignored: 'I',
  conflict: 'C',
};

const statusTitles: Record<GitFileStatus, string> = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
  renamed: 'Renamed',
  untracked: 'Untracked',
  ignored: 'Ignored',
  conflict: 'Conflict',
};

interface GitFileListProps {
  files: GitChangedFile[];
}

export function GitFileList({ files }: GitFileListProps) {
  return (
    <ul className="git-panel-list">
      {files.map((file) => (
        <li
          className="git-panel-row"
          key={file.path}
          title={`${statusTitles[file.status]} · ${file.relativePath}`}
        >
          <button
            className="git-panel-open"
            type="button"
            onClick={() => openGitChanges(file.path)}
          >
            <span className={`git-panel-status git-${file.status}`}>{statusLabels[file.status]}</span>
            <span className="git-panel-file">
              <span>{titleFromPath(file.relativePath)}</span>
              <small>{directoryFromRelativePath(file.relativePath)}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
