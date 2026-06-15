# Design: Markdown Forge–style UI for Markdown Live Server

**Date:** 2026-06-15
**Status:** Approved (pending spec review)

## Goal

Bring the in-browser preview UI of the **Markdown Live Server** VS Code extension up to
the polish of the *Markdown Forge* plugin. Three workstreams:

1. **Redesigned left menu** — branded header, icon-based file tree, and a footer with
   **Theme** and **Code Theme** selectors plus a light/dark toggle.
2. **In-browser editing** — a professional CodeMirror 6 editor that writes changes back to
   the file on disk, with writes accepted **only from loopback** (`localhost` / `127.0.0.1`).
3. **Header bar** — branding in the sidebar (logo + "Md Live Server"); in the main view a
   sticky bar showing the current file's relative path plus Print, Edit, and light/dark controls.

## Scope

- **Applies to:** Markdown file pages **and** directory-listing pages — both already route
  through `renderMarkdownPage` (`renderDirectoryMarkdownPage` builds an index and calls it).
- **Unchanged:** HTML files served via `renderHtmlPage` keep their current behavior
  (live-reload script injection only).
- **Edit availability:** the Edit control appears only on `.md` **file** pages
  (`editable = true`), never on directory listings (`editable = false`).

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Edit save behavior | Save back to disk; writes accepted only from loopback. Edit UI hidden for non-loopback viewers; server enforces loopback as the real guard. |
| Theme set | Full named palette set (`modern`, `aurora`, `forest`, `midnight`, `ghibli`) × independent light/dark mode. |
| Page scope | Markdown pages **and** directory listings. HTML files unchanged. |
| Editor widget | **CodeMirror 6** (CDN, ESM), falling back to a plain `<textarea>` if the CDN is unreachable. |
| Editor layout | Split view: editor (left) + live preview (right); Save / Cancel. |
| Persistence | `localStorage` (consistent with the current theme persistence). |

## Architecture

### Module structure

`template.ts` is already ~650 lines; the new concerns are factored out so no single file
becomes unmanageable.

- **`src/themes.ts`** (new, pure data + small helpers — easily unit-tested)
  - `CONTENT_THEMES`: `Record<themeName, { light: Vars; dark: Vars }>` where `Vars` covers
    `--bg --fg --muted --border --code-bg --link --sidebar-bg --header-bg --accent`.
  - `CODE_THEMES`: ordered `Array<{ id, label, href }>` mapping each highlight.js theme to its
    jsDelivr stylesheet URL.
  - `buildThemeCss()`: emits the `:root[data-theme="x"][data-mode="y"] { … }` blocks.
  - `DEFAULT_CONTENT_THEME = 'modern'`, `DEFAULT_CODE_THEME = 'github-dark'`.
- **`src/template.ts`** (refactor): `renderMarkdownPage` keeps its public role as assembler but
  delegates to focused private helpers:
  - `renderHeaderBar()` — sticky top bar (hamburger · path crumb · spacer · Print · Edit · mode toggle).
  - `renderSidebar()` — branded header, tree container, footer (Theme / Code Theme / mode toggle).
  - `renderEditorAssets()` — CodeMirror loader + editor markup + save/cancel wiring (emitted only when `editable`).
  - `renderClientScript()` — existing sidebar/theme/websocket logic, extended for the new controls.
- **`src/server.ts`** (extend): add `express.json()` (with a size limit), two `__mdls__` routes
  registered **before** the `*` catch-all, and a `saveFile()` helper. Pass `editable` into
  `renderMarkdownPage` (`true` for `.md` files, `false` for directories).

### Theme system

Two **independent** dimensions, both stored in `localStorage`:

- `data-theme` (palette): `modern | aurora | forest | midnight | ghibli`
- `data-mode`: `light | dark`

Each palette defines the full CSS-variable set for **both** modes, so the light/dark toggle
works the same regardless of palette. Switching a palette or mode:

- updates `document.documentElement` data attributes,
- re-runs `renderMermaid()` with the matching `theme: 'dark' | 'default'`,
- (mode change) swaps the highlight.js stylesheet only if the selected code theme has a
  paired light/dark variant — otherwise the chosen code theme is left as-is.

**Code Theme** swaps the `#hljs-theme` stylesheet `href` from `CODE_THEMES`. Options match the
reference: GitHub Dark, GitHub, Atom One Dark, Atom One Light, Dracula, Nord, Monokai, VS 2015,
VS, Tokyo Night Dark, Tokyo Night Light, A11y Dark, A11y Light.

`localStorage` keys (additions): `md-live-server-content-theme`, `md-live-server-code-theme`.
Existing `md-live-server-theme` (light/dark) is reused as `data-mode`. Existing
`md-live-server-tree-state` and `md-live-server-menu-collapsed` are unchanged.

### Header bar (main view)

Sticky bar at the top of `#content`'s column:

```
[☰]  📄 docs/02_DD/VI/00_SystemArchitecture.md            [🖨 Print] [✎ Edit] [☾/☀]
```

- **☰** toggles the sidebar (reuses existing collapse logic; the button moves into the bar,
  replacing the old free-floating toggle).
- **Path crumb**: derived client-side from `decodeURIComponent(location.pathname)` with the
  leading `/` stripped — works for both files and directories, no new server plumbing.
- **Print**: `window.print()`. A `@media print` block hides sidebar + header bar and resets
  the content margins so only the document prints.
- **Edit**: shown only when `editable` **and** `location.hostname` is loopback. Toggles the
  editor (see below).
- **Mode toggle**: light/dark (same action as the sidebar footer toggle; both stay in sync).

The old top-right floating toolbar button is removed; its function moves into the header bar.

### Sidebar (left menu)

- **Header**: inline-SVG logo + "Md Live Server" (no CDN/icon-font dependency).
- **Tree**: existing tree logic, restyled — inline-SVG folder/file icons, chevron toggles,
  active-item highlight via `--accent`. Search box retained.
- **Footer** (pinned to the bottom): **Theme** `<select>`, **Code Theme** `<select>`, and a
  light/dark toggle button. Selects are populated from the theme catalogs and reflect the
  persisted selection.

### In-browser edit

**Endpoints** (registered before the `*` catch-all; both guarded by a loopback check on
`req.socket.remoteAddress` normalized against `127.0.0.1`, `::1`, `::ffff:127.0.0.1` → non-loopback ⇒ `403`):

- `GET /__mdls__/source?path=<requestPath>` → `{ content: string }`. Resolves+hardens the path
  via the existing `resolveRequestPath`; must be a `.md` file inside root. Returns raw Markdown.
- `POST /__mdls__/save` → body `{ path: string, content: string }`. Same hardening; must be a
  `.md` inside root. Writes via `fs.writeFileSync`, then calls `broadcastChange(filePath, content)`
  so every connected client live-updates. Returns `{ ok: true }` or an error status.

**Editor (client):**

- CodeMirror 6 loaded as ESM from CDN (`codemirror`, `@codemirror/lang-markdown`, and a dark
  theme), matching the existing dynamic-import pattern used for Mermaid/highlight.js. If the
  import fails, fall back to a styled `<textarea>` (feature still fully works).
- Live preview pane re-renders on input (debounced) using **markdown-it from CDN** with the same
  options as the server (`html, linkify, typographer`), then runs `renderMermaid()` /
  `highlightCode()` on the preview. The server render on Save remains the source of truth; minor
  client/server rendering divergence in the live pane is acceptable. If markdown-it fails to load,
  the preview pane shows "live preview unavailable — Save to render" and Save still works.
- CodeMirror theme follows `data-mode` (dark theme in dark mode, default otherwise) via a
  reconfigurable Compartment.

**Edit lifecycle:**

1. Click **Edit** → `GET …/source` fetches raw Markdown → content view is replaced by the split editor.
2. **While editing, incoming WebSocket `markdown`/`reload` messages for the current path are
   suppressed** so live-reload can't clobber unsaved edits.
3. **Save** → `POST …/save`. On success: button shows a transient "Saved" state, edit mode exits,
   WS handling resumes, and the broadcast refreshes the preview authoritatively. On failure: an
   inline error is shown and the editor stays open with content intact.
4. **Cancel** → discard local changes, exit edit mode, resume WS handling.

### Security & compatibility

- Server still binds `0.0.0.0`; LAN users can **view** but **cannot write** (loopback enforced
  server-side; Edit UI also hidden for them). This satisfies "save only on localhost/127.0.0.1."
- Path hardening for both new endpoints reuses `resolveRequestPath` (relative-path + realpath
  symlink-escape checks), so the write surface is confined to `.md` files under the served root.
- `express.json()` is added with a body-size limit to bound request size.
- No changes to `renderHtmlPage` or the WebSocket protocol beyond reusing existing message types.

## Testing (vitest, following `test/`)

- **`themes.ts`**: every `CODE_THEMES` entry has a non-empty `id`/`label`/`href` and an
  `https://cdn.jsdelivr.net/...` URL; every `CONTENT_THEMES` palette defines the complete
  variable set for both `light` and `dark`; `buildThemeCss()` emits a selector per
  (theme, mode) pair; defaults exist in the catalogs.
- **save endpoint** (`server.ts`): loopback request writes the file and triggers a broadcast;
  non-loopback request → `403` with no write; traversal / non-`.md` / outside-root paths rejected;
  the GET source endpoint returns raw content for a valid loopback request and `403` otherwise.
- **template**: `renderMarkdownPage(..., editable=true)` includes the header bar, path-crumb
  element, Theme/Code-Theme selectors, and editor assets; `editable=false` omits the editor
  assets but keeps the header (sans Edit) and theme selectors; directory listings render with
  the new chrome.

## Out of scope (YAGNI)

- HTML-file chrome redesign / editing of `.html` files.
- Creating, renaming, or deleting files from the browser.
- Multi-file/tabbed editing, autosave, or conflict resolution beyond last-write-wins.
- Server-rendered live preview round-trips (client-side markdown-it is sufficient for the pane).
