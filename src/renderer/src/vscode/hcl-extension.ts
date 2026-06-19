import hclGrammar from '@shikijs/langs/hcl';
import terraformGrammar from '@shikijs/langs/terraform';
import {
  ExtensionHostKind,
  registerExtension,
  type IExtensionManifest,
} from '@codingame/monaco-vscode-api/extensions';

function grammarBlobUrl(grammar: unknown): string {
  return URL.createObjectURL(new Blob([JSON.stringify(grammar)], { type: 'application/json' }));
}

const manifest: IExtensionManifest = {
  name: 'carlo-hcl',
  displayName: 'Carlo HCL/Terraform Syntax',
  description: 'HCL and Terraform syntax highlighting bundled with Carlo',
  categories: ['Programming Languages'],
  version: '1.0.0',
  publisher: 'carlo',
  engines: { vscode: '*' },
  contributes: {
    languages: [
      {
        id: 'hcl',
        aliases: ['HCL', 'hcl'],
        extensions: ['.hcl'],
      },
      {
        id: 'terraform',
        aliases: ['Terraform', 'tf', 'tfvars'],
        extensions: ['.tf', '.tfvars'],
      },
    ],
    grammars: [
      {
        language: 'hcl',
        scopeName: 'source.hcl',
        path: './grammars/hcl.tmLanguage.json',
      },
      {
        language: 'terraform',
        scopeName: 'source.hcl.terraform',
        path: './grammars/terraform.tmLanguage.json',
      },
    ],
  },
};

const { registerFileUrl, whenReady } = registerExtension(
  manifest,
  ExtensionHostKind.LocalWebWorker,
  { system: true },
);

registerFileUrl('./grammars/hcl.tmLanguage.json', grammarBlobUrl(hclGrammar[0]));
registerFileUrl('./grammars/terraform.tmLanguage.json', grammarBlobUrl(terraformGrammar[0]));

export { whenReady as hclExtensionReady };
