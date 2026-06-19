import {
  ExtensionHostKind,
  registerExtension,
  type IExtensionManifest,
} from '@codingame/monaco-vscode-api/extensions';

const manifest: IExtensionManifest = {
  name: 'carlo-nord-theme',
  displayName: 'Carlo Nord Theme',
  description: 'Nord theme bundled with Carlo',
  categories: ['Themes'],
  version: '1.0.0',
  publisher: 'carlo',
  engines: { vscode: '*' },
  contributes: {
    themes: [
      {
        id: 'Nord',
        label: 'Nord',
        uiTheme: 'vs-dark',
        path: './themes/nord.json',
      },
    ],
  },
};

const { registerFileUrl, whenReady } = registerExtension(
  manifest,
  ExtensionHostKind.LocalWebWorker,
  { system: true },
);
registerFileUrl('./themes/nord.json', new URL('./themes/nord.json', import.meta.url).toString());

export { whenReady as nordThemeReady };
