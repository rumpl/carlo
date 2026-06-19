import { getService, IQuickInputService } from '@codingame/monaco-vscode-api/services';
import type { IQuickPickItem } from '@codingame/monaco-vscode-api/vscode/vs/platform/quickinput/common/quickInput';
import { getCommands, runCommand, type Command } from '../commands/registry';

interface CommandItem extends IQuickPickItem {
  command: Command;
}

export async function showNativeCommandPalette(): Promise<void> {
  const quickInputService = await getService(IQuickInputService);
  const picker = quickInputService.createQuickPick<CommandItem>();

  picker.placeholder = 'Type a command';
  picker.value = '>';
  picker.filterValue = (value) => value.replace(/^>\s*/, '');
  picker.matchOnDescription = true;
  picker.matchOnDetail = true;
  picker.sortByLabel = true;
  picker.items = getCommands()
    .filter((command) => command.id !== 'workbench.action.showCommands')
    .map((command) => ({
      label: command.title,
      description: command.keybinding,
      detail: command.id,
      command,
    }));

  const disposables = [
    picker.onDidChangeValue((value) => {
      if (!value.startsWith('>')) picker.value = `>${value}`;
    }),
    picker.onDidAccept(() => {
      const item = picker.activeItems[0] ?? picker.selectedItems[0];
      if (!item) return;
      picker.hide();
      void runCommand(item.command.id);
    }),
    picker.onDidHide(() => {
      disposables.forEach((disposable) => disposable.dispose());
      picker.dispose();
    }),
  ];

  picker.show();
}
