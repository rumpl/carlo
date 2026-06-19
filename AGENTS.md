# AGENTS.md

Guidance for coding agents working on Carlo.

## Project overview

Carlo is a small Electron IDE. Keep it focused: file tree, tabs/splits, Monaco, LSP, basic commands/settings. Avoid features that turn it into a general platform.

Main areas:

- `src/main/` — Electron main process, app lifecycle, windows, menus, IPC handlers, LSP subprocess management.
- `src/preload/` — safe renderer API exposed through `contextBridge`/IPC.
- `src/renderer/` — React UI, editor integration, file tree, commands, settings, LSP client.
- `src/shared/` — types/config used by both main and renderer. Keep IPC payload types here when possible.
- `electron.vite.config.ts` — build config and aliases.

Aliases:

- `@shared` -> `src/shared`
- renderer aliases `monaco-editor` to `@codingame/monaco-vscode-editor-api`

## Commands to run

Before handing off non-trivial changes, run:

```sh
npm run typecheck
npm run lint
npm run build
```

For main-process-only changes, at minimum:

```sh
npm run typecheck:node
npm run lint
```

Do not introduce package downloads or dependency changes unless explicitly requested.

## Electron / IPC rules

- Register global `ipcMain.handle` handlers once from `src/main/index.ts`, not per window.
- Per-window state belongs in maps keyed by `webContents.id` or in window-specific cleanup handlers.
- When an IPC request needs a window, derive it from `event.sender` (`BrowserWindow.fromWebContents`) instead of closing over a particular window.
- Always clean up per-window resources on `closed`/`destroyed`:
  - file watchers
  - LSP managers/processes
  - theme listeners
- Keep `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` unless there is a very strong reason.
- Do not expose raw Node/Electron APIs to the renderer. Add narrow methods in `src/preload/api.ts` and type payloads in `src/shared`.
- Block unexpected renderer popups. Monaco/VS Code code can accidentally try to open worker/chunk URLs as windows; `setWindowOpenHandler` should deny those.

## Multi-window behavior

- The packaged app uses a single-instance lock. Subsequent `carlo <dir>` launches should create a new window in the existing app, not start a full second Electron app.
- Each window must be able to use a different workspace directory.
- Watchers and LSP managers must be per-window. Avoid module-level singleton state for workspace-specific data unless it is intentionally shared.
- Menu commands should target the focused window, not the first-created window.

## Performance watch-outs

Startup performance is a core feature. Be very careful with imports and synchronous work.

### Renderer startup

- Do not statically import Monaco, `monaco-languageclient`, or `@codingame/monaco-vscode-*` from modules that are part of the initial React shell.
- Keep the first render light: show the shell/file tree quickly, then initialize VS Code/Monaco services lazily.
- Use `src/renderer/src/vscode/servicesReady.ts` (`ensureVscodeServices`) for lazy VS Code service initialization.
- Prefer dynamic imports for editor-only features:
  - `../editor/MonacoEditor`
  - `../editor/models`
  - `../editor/gitGutter`
  - `../editor/navigationHistory`
  - `../lsp/LanguageClientService`
  - quick open / command palette services
- After build, inspect chunk output. If the initial renderer chunk suddenly includes `editor.api`, `initServices`, `referencesWidget`, or `LanguageClientService`, a static import probably regressed startup.
- Avoid top-level `await` in `src/renderer/src/main.tsx` for anything nonessential. Rendering the app shell should not wait on config or Monaco services.

### Main process startup

- Avoid expensive synchronous filesystem work before `app.whenReady()` creates the first window.
- Load small config files synchronously only if needed; do not recursively scan workspaces at startup.
- Do not run `git status`, LSP resolution, or recursive tree walking until requested by a window.

### File tree and workspace

- Initial tree listing should be shallow. Recursive listing is only for quick open or explicit needs.
- Ignore heavy directories such as `.git`, `node_modules`, `out`, `dist`, and `build` when listing/watching.
- Watchers must filter ignored paths before sending renderer updates.
- Be cautious with `git status --untracked-files=all --ignored=matching`; it can be expensive on large repos. Do not call it more often than needed.

### Editor / LSP

- Start language servers only when a file is opened or an LSP-backed command needs one.
- Keep LSP processes scoped per window and stop them when the window is destroyed.
- Do not start language servers for languages configured as `null`.
- Git gutter baseline calls run git commands; debounce updates and only refresh visible editors.

### Build size

- The Monaco/VS Code stack is large. Avoid importing it from common UI components (`App`, `StatusBar`, `TabBar`, `FileTree`, settings stores) unless lazy-loaded.
- If adding UI that only sometimes needs editor APIs, load those APIs inside the event handler or effect that needs them.

## Coding style

- TypeScript strictness matters. Prefer explicit shared request/result interfaces for IPC.
- Keep React components simple and avoid global mutable state in renderer except for intentional service registries/stores.
- Use Zustand stores for app state already modeled there; avoid duplicating workspace/tab state elsewhere.
- Keep command registration in `src/renderer/src/commands/builtinCommands.ts`; command invocation goes through `commands/registry.ts`.
- Preserve existing keyboard shortcut behavior (`Ctrl` in UI text; Electron maps menu accelerators to `Cmd` on macOS).

## Testing checklist for common changes

For window/CLI changes:

1. Launch packaged/dev app with no args.
2. Run `carlo <different-dir>` while it is open.
3. Confirm a second window opens quickly and uses the requested workspace.
4. Confirm the first window keeps its original workspace.

For startup/performance changes:

1. Run `npm run build` and inspect emitted chunk names/sizes.
2. Confirm the initial renderer chunk did not absorb Monaco/VS Code service chunks.
3. Launch cold and verify the shell appears before editor services finish warming.

For editor/LSP changes:

1. Open a file with a configured language server.
2. Confirm LSP status updates in the status bar.
3. Close the window and confirm the server process exits.

## Philosophy reminder

Carlo should remain "the useful part of VS Code without the rest of VS Code." Prefer small, direct features over extensibility frameworks, marketplaces, background daemons, telemetry, or project systems.
