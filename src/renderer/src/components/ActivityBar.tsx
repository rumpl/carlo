import { useWorkbenchUiStore } from '../store/useWorkbenchUiStore';

export function ActivityBar() {
  const sidebarVisible = useWorkbenchUiStore((state) => state.sidebarVisible);
  const toggleSidebar = useWorkbenchUiStore((state) => state.toggleSidebar);

  return (
    <nav className="activity-bar" aria-label="Activity Bar">
      <button
        className={`activity-bar-button ${sidebarVisible ? 'active' : ''}`}
        type="button"
        onClick={toggleSidebar}
        title="Explorer (Cmd+Shift+E)"
        aria-label="Toggle Explorer"
        aria-pressed={sidebarVisible}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 3.5h9l5 5v12H5z" />
          <path d="M14 3.5v5h5" />
          <path d="M8 13h8M8 16h8" />
        </svg>
      </button>
    </nav>
  );
}
