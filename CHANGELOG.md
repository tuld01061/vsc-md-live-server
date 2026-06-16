# Changelog

All notable changes to Markdown Live Server are documented here.

## 0.2.1

- Fixed the in-browser editor silently falling back to a plain textarea instead of the CodeMirror editor. CodeMirror (and markdown-it for the live preview) are now bundled with the extension and served locally, so the editor loads reliably and works offline instead of depending on an unreliable CDN.
- Fixed code blocks not being syntax-highlighted in the preview (Highlight.js was loaded from a 404 CDN path; now uses a working endpoint).
- Revamped the README for the Marketplace with a header, badges, and UI screenshots.

## 0.2.0

- Redesigned the preview: branded sidebar with logo and an icon-based file tree (folder and file icons), plus a header bar showing the current file path with Print, Edit, and light/dark controls.
- Added a Theme selector with 7 palettes — Aurora, Forest, Ghibli, Midnight, Modern, Ocean, and Sunset — each with light and dark variants; selections persist per browser.
- Added a Code Theme selector for syntax highlighting (multiple Highlight.js themes).
- Added in-browser Markdown editing with live preview; saving writes back to the file on disk and is restricted to local (`localhost`/`127.0.0.1`) viewers.
- Added a configurable server port via `mdLiveServer.port` (default `4400`) with automatic fallback to the next free port when it is in use.
- Fixed live reload for viewers on other devices: the reload socket now connects to the serving host instead of `127.0.0.1`.
- Fixed live updates for files whose names contain non-ASCII characters or spaces.

## 0.1.0

- Added site menu sidebar that auto-scans the workspace for `.md` and `.html` files.
- Sidebar includes collapsible tree view, search/filter, active file highlighting, and expand-state persistence.
- Added show/hide toggle button for the sidebar (desktop) and hamburger menu (mobile).
- Directory index pages now render with the sidebar and live-reload support.
- Non-Markdown/HTML active files fall back to the parent directory instead of triggering a browser download.
- Server always serves from the workspace root so the sidebar shows the full project tree.
- Added VS Code settings for site menu: `mdLiveServer.siteMenu.enabled`, `include`, and `exclude`.

## 0.0.4

- Fixed server not being exposed to LAN so external devices can access previews.
- Fixed Mermaid diagram rendering.
- Fixed server reuse for files in the same workspace, preventing duplicate server startup.

## 0.0.3

- Added live reload for HTML files by injecting a WebSocket script into previewed HTML pages.
- Hardened path resolution with `realpath` checks to prevent symlink directory traversal.
- Added per-client path tracking so Markdown updates are broadcast only to clients viewing the same file.
- External links in Markdown previews now open in a new tab with `rel="noopener noreferrer"`.

## 0.0.2

- Fixed Marketplace package runtime by bundling extension dependencies.
- Restored startup activation so status bar item appears after installation.

## 0.0.1

- Initial release.
- Added Markdown preview server.
- Added Mermaid rendering.
- Added live reload for Markdown and static files.
- Added light/dark preview theme toggle.
- Added start, stop, and toggle commands.
