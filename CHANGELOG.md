# Changelog

All notable changes to Markdown Live Server are documented here.

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
