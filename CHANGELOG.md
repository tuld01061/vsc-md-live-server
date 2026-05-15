# Changelog

All notable changes to Markdown Live Server are documented here.

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
