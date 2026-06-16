# Markdown Live Server

**A fast, themeable live preview for Markdown — right from VS Code.**

## Highlights

- **⚡ Live reload** — save any file and the browser updates instantly.
- **📊 Mermaid diagrams** — fenced `mermaid` blocks render inline.
- **🌈 Syntax highlighting** — choose from many code themes (GitHub, Dracula, Nord, Tokyo Night, and more).
- **🎨 7 themes × light/dark** — Aurora, Forest, Ghibli, Midnight, Modern, Ocean, Sunset.
- **📝 In‑browser editing** — edit Markdown in a CodeMirror editor; saving writes back to disk.
- **🗂️ Project sidebar** — auto‑scans your workspace for Markdown/HTML files.
- **🖨️ Print** — one click to print just the document.
- **📡 LAN sharing** — preview is reachable from other devices on your network.

## Getting Started

1. Install from the Marketplace.
2. Open a folder or a Markdown file in VS Code.
3. Command Palette → **Markdown Live Server: Start Markdown Live Server**.
4. Your browser opens the preview — edit and save to see live reload in action.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `mdLiveServer.port` | `4400` | Preferred server port. |
| `mdLiveServer.siteMenu.enabled` | `true` | Show the project sidebar. |
| `mdLiveServer.siteMenu.include` | `["*"]` | Glob patterns to include. |
| `mdLiveServer.siteMenu.exclude` | `[".*", "node_modules"]` | Glob patterns to exclude. |

## Commands

| Command | Description |
| --- | --- |
| `md-live-server.start` | Start the server and open the browser. |
| `md-live-server.stop` | Stop the current server. |
| `md-live-server.toggle` | Start or stop the server. |
