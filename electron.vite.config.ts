import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } },
    build: { rollupOptions: { input: resolve('src/main/index.ts'), external: ['electron'] } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } },
    build: {
      rollupOptions: {
        input: resolve('src/preload/index.ts'),
        external: ['electron'],
        output: { format: 'cjs', entryFileNames: 'index.js' },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: {
      alias: {
        'monaco-editor': '@codingame/monaco-vscode-editor-api',
        '@shared': resolve('src/shared'),
      },
      dedupe: ['@codingame/monaco-vscode-editor-api', 'monaco-languageclient', 'vscode'],
    },
    optimizeDeps: {
      exclude: [
        '@codingame/monaco-vscode-api',
        '@codingame/monaco-vscode-base-service-override',
        '@codingame/monaco-vscode-editor-api',
        '@codingame/monaco-vscode-extension-api',
        '@codingame/monaco-vscode-configuration-service-override',
        '@codingame/monaco-vscode-files-service-override',
        '@codingame/monaco-vscode-languages-service-override',
        '@codingame/monaco-vscode-textmate-service-override',
        '@codingame/monaco-vscode-theme-service-override',
        '@codingame/monaco-vscode-keybindings-service-override',
        '@codingame/monaco-vscode-quickaccess-service-override',
        '@codingame/monaco-vscode-theme-defaults-default-extension',
        '@codingame/monaco-vscode-typescript-basics-default-extension',
        '@codingame/monaco-vscode-json-default-extension',
        '@codingame/monaco-vscode-go-default-extension',
        '@codingame/monaco-vscode-rust-default-extension',
        'vscode',
        'monaco-languageclient',
      ],
      esbuildOptions: { target: 'esnext', plugins: [importMetaUrlPlugin] },
    },
    worker: { format: 'es' },
    build: { target: 'esnext', rollupOptions: { input: resolve('src/renderer/index.html') } },
    assetsInclude: ['**/*.wasm'],
  },
});
