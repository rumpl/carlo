import { initialize } from '@codingame/monaco-vscode-api';
import { servicesInitialized } from '@codingame/monaco-vscode-api/lifecycle';
import getBaseServiceOverride from '@codingame/monaco-vscode-base-service-override';
import getConfigurationServiceOverride from '@codingame/monaco-vscode-configuration-service-override';
import getFilesServiceOverride from '@codingame/monaco-vscode-files-service-override';
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override';
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import getQuickAccessServiceOverride from '@codingame/monaco-vscode-quickaccess-service-override';
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import '@codingame/monaco-vscode-bat-default-extension';
import '@codingame/monaco-vscode-clojure-default-extension';
import '@codingame/monaco-vscode-coffeescript-default-extension';
import '@codingame/monaco-vscode-cpp-default-extension';
import '@codingame/monaco-vscode-csharp-default-extension';
import '@codingame/monaco-vscode-css-default-extension';
import '@codingame/monaco-vscode-dart-default-extension';
import '@codingame/monaco-vscode-diff-default-extension';
import '@codingame/monaco-vscode-docker-default-extension';
import '@codingame/monaco-vscode-fsharp-default-extension';
import '@codingame/monaco-vscode-git-base-default-extension';
import '@codingame/monaco-vscode-go-default-extension';
import '@codingame/monaco-vscode-groovy-default-extension';
import '@codingame/monaco-vscode-handlebars-default-extension';
import '@codingame/monaco-vscode-hlsl-default-extension';
import '@codingame/monaco-vscode-html-default-extension';
import '@codingame/monaco-vscode-ini-default-extension';
import '@codingame/monaco-vscode-java-default-extension';
import '@codingame/monaco-vscode-javascript-default-extension';
import '@codingame/monaco-vscode-json-default-extension';
import '@codingame/monaco-vscode-julia-default-extension';
import '@codingame/monaco-vscode-latex-default-extension';
import '@codingame/monaco-vscode-less-default-extension';
import '@codingame/monaco-vscode-log-default-extension';
import '@codingame/monaco-vscode-lua-default-extension';
import '@codingame/monaco-vscode-make-default-extension';
import '@codingame/monaco-vscode-markdown-basics-default-extension';
import '@codingame/monaco-vscode-objective-c-default-extension';
import '@codingame/monaco-vscode-perl-default-extension';
import '@codingame/monaco-vscode-php-default-extension';
import '@codingame/monaco-vscode-powershell-default-extension';
import '@codingame/monaco-vscode-pug-default-extension';
import '@codingame/monaco-vscode-python-default-extension';
import '@codingame/monaco-vscode-r-default-extension';
import '@codingame/monaco-vscode-razor-default-extension';
import '@codingame/monaco-vscode-restructuredtext-default-extension';
import '@codingame/monaco-vscode-ruby-default-extension';
import '@codingame/monaco-vscode-rust-default-extension';
import '@codingame/monaco-vscode-scss-default-extension';
import '@codingame/monaco-vscode-shaderlab-default-extension';
import '@codingame/monaco-vscode-shellscript-default-extension';
import '@codingame/monaco-vscode-sql-default-extension';
import '@codingame/monaco-vscode-swift-default-extension';
import '@codingame/monaco-vscode-typescript-basics-default-extension';
import '@codingame/monaco-vscode-vb-default-extension';
import '@codingame/monaco-vscode-xml-default-extension';
import '@codingame/monaco-vscode-yaml-default-extension';
import './hcl-extension';
import './nord-theme';
import { configureWorkers } from './workers';

declare global {
  var __carloVscodeServicesPromise: Promise<void> | undefined;
}

export function initVscodeServices(): Promise<void> {
  if (servicesInitialized) return Promise.resolve();

  globalThis.__carloVscodeServicesPromise ??= (async () => {
    if (servicesInitialized) return;

    configureWorkers();
    try {
      await initialize({
        ...getBaseServiceOverride(),
        ...getConfigurationServiceOverride(),
        ...getFilesServiceOverride(),
        ...getLanguagesServiceOverride(),
        ...getTextmateServiceOverride(),
        ...getThemeServiceOverride(),
        ...getKeybindingsServiceOverride(),
        ...getQuickAccessServiceOverride(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Services are already initialized') return;
      throw error;
    }
  })();
  return globalThis.__carloVscodeServicesPromise;
}
