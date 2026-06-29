import { showNativeCommandPalette } from '../../quickopen/nativeCommandPalette';
import { showNativeQuickOpen } from '../../quickopen/nativeQuickOpen';
import { registerCommand } from '../registry';

async function installCommandLine(): Promise<void> {
  const result = await window.api.app.installCommandLine();
  if (result.ok) {
    window.alert(
      [`Installed the 'carlo' shell command at:`, result.path, result.warning]
        .filter(Boolean)
        .join('\n\n'),
    );
    return;
  }

  window.alert(
    [`Could not install the 'carlo' shell command.`, result.error, result.instructions]
      .filter(Boolean)
      .join('\n\n'),
  );
}

export function registerApplicationCommands(): void {
  registerCommand({
    id: 'workbench.action.showCommands',
    title: 'Show Command Palette',
    keybinding: 'Ctrl+Shift+P',
    run: showNativeCommandPalette,
  });
  registerCommand({
    id: 'workbench.action.quickOpen',
    title: 'Quick Open File',
    keybinding: 'Ctrl+P',
    run: showNativeQuickOpen,
  });
  registerCommand({
    id: 'app.installCommandLine',
    title: "Shell Command: Install 'carlo' Command in PATH",
    run: installCommandLine,
  });
  registerCommand({
    id: 'window.zoomIn',
    title: 'Zoom In',
    keybinding: 'Ctrl+=',
    run: async () => {
      await window.api.window.zoomIn();
    },
  });
  registerCommand({
    id: 'window.zoomOut',
    title: 'Zoom Out',
    keybinding: 'Ctrl+-',
    run: async () => {
      await window.api.window.zoomOut();
    },
  });
  registerCommand({
    id: 'window.zoomReset',
    title: 'Reset Zoom',
    keybinding: 'Ctrl+0',
    run: async () => {
      await window.api.window.zoomReset();
    },
  });
}
