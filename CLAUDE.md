# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Markdown Live Server is a VS Code extension that starts a local Express server to preview Markdown (with Mermaid diagram support), HTML, and static files with live reload. The extension is bundled with esbuild into a single `out/extension.js` file.

## Development Commands

```bash
npm run compile      # Clean + typecheck + esbuild bundle → out/extension.js
npm run watch        # tsc --watch for type checking only
npm run test         # vitest run (tests are in test/)
npm run package      # vsce package → md-live-server-X.X.X.vsix
npm run publish      # vsce publish to Marketplace
npm run lint:package # vsce ls --tree (see what files get packaged)
```

**Press F5** in VS Code to launch an Extension Development Host for manual testing.

## Architecture

### Source Files

- **[src/extension.ts](src/extension.ts)** — VS Code extension entry point. Manages commands (`start`/`stop`/`toggle`), status bar item, and file change events. Tracks global server state (`liveServer`, `liveRootPath`, `livePort`).
- **[src/server.ts](src/server.ts)** — `MarkdownLiveServer` class. Express HTTP server + WebSocket server on the same `http.Server`. Handles file resolution, Markdown rendering, and change broadcasting.
- **[src/template.ts](src/template.ts)** — HTML template generators for Markdown preview, HTML file injection (WebSocket script), and directory listings.

### Key Design Decisions

**Single-file bundle:** `npm run compile` uses esbuild (not tsc) to produce `out/extension.js`. The `outDir` in `tsconfig.json` is vestigial — the actual output is a bundled CJS file. Tests run directly via vitest (TypeScript files are excluded from tsc compilation).

**HTTP + WebSocket on same port:** The Express app handles file serving. A `ws.WebSocketServer` is attached to the underlying `http.Server`. This means both share the same port, and the WebSocket URL in templates uses `ws://127.0.0.1:${port}`.

**Per-client path tracking:** When a client connects, it sends `{"type":"subscribe","path":"/filename.md"}`. The server stores this in a `WeakMap<WebSocket, string>`. When broadcasting a Markdown change, only clients subscribed to that exact path receive the update. Non-Markdown changes trigger a `reload` message to all clients.

**HTML live reload via injection:** HTML files are served by injecting a WebSocket script before `</body>` ([template.ts:211](src/template.ts:211)). If no `</body>` tag exists, the script is appended.

**Path hardening with `realpath`:** `resolveRequestPath` defends against directory traversal using two layers: (1) `path.relative(rootPath, joinedPath)` for the raw path, and (2) `fs.realpathSync` + `path.relative(rootRealPath, resolvedPath)` to prevent symlink escapes ([server.ts:172](src/server.ts#L172)).

**Server binds to `0.0.0.0`:** The HTTP server listens on `0.0.0.0` (not `127.0.0.1`), making previews accessible on the LAN. The status bar shows both local and LAN URLs.

**Mermaid and syntax highlighting from CDN:** The Markdown preview template loads Mermaid v10 and Highlight.js v11 from jsDelivr. Mermaid rendering happens client-side after DOM insertion. Theme switching toggles a `data-theme` attribute and swaps the Highlight.js CSS URL, then reloads the page.

## Release Process

Follow [RELEASE.md](RELEASE.md). Summary:

1. Ensure `CHANGELOG.md` has the new version section (not "Unreleased").
2. Commit changes: `git add CHANGELOG.md && git commit -m "Prepare X.X.X release"`
3. Bump version: `npm version patch|minor|major` — updates `package.json`, `package-lock.json`, creates a commit, and tags `vX.X.X`.
4. Push: `git push origin main --follow-tags`

Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml` which packages, optionally publishes to the VS Marketplace (requires `VSCE_PAT` secret), and creates a GitHub Release with the `.vsix` attached.

### Common Issue: `npm run package` fails with extraneous packages

If `vsce package` errors about extraneous packages (e.g., `playwright`), run `npm prune` first to clean `node_modules`.
