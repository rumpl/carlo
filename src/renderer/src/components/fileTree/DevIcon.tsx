import { icons } from '@iconify-json/vscode-icons';
import type { IconifyIcon } from '@iconify/types';

export function DevIcon({ icon }: { icon: IconifyIcon }) {
  return (
    <span
      className="tree-devicon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 ${icon.width ?? icons.width ?? 16} ${icon.height ?? icons.height ?? 16}" width="16" height="16">${icon.body}</svg>`,
      }}
    />
  );
}
