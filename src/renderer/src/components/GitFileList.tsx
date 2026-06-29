import type { GitChangedFile } from '@shared/file-types';
import { openGitChanges } from '../git/diffTabs';
import { directoryFromRelativePath, titleFromPath } from '../commands/builtin/pathUtils';
import { statusLabels, statusTitles } from '../git/gitStatusMaps';

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
