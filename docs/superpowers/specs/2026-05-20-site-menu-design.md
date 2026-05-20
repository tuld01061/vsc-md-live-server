# Site Menu Sidebar Design

## Overview

Add a left sidebar site menu to the Markdown Live Server preview. When the server starts, it automatically scans the root folder and builds a collapsible tree menu of all supported files. The menu appears alongside the content in the browser preview and updates in real-time when files change.

## Motivation

Currently, navigating between files in a preview workspace requires using the browser back button or manually typing URLs. A site menu provides:
- Quick navigation between all files in the workspace
- Visual overview of project structure
- Real-time awareness of new/deleted files

## Requirements

### Functional

1. **Left sidebar** — fixed width panel on the left side of the preview page
2. **Tree view** — hierarchical display of files and folders from the workspace root
3. **All files included** — by default, all files appear in the tree (not just .md and .html)
4. **Hidden files excluded** — files/folders starting with `.` are hidden by default
5. **Configurable** — via VS Code Settings (`mdLiveServer.siteMenu.*`)
6. **Collapsible folders** — click to expand/collapse; state persists across page reloads via localStorage
7. **Active file highlight** — the currently viewed file is visually highlighted
8. **Search/filter** — real-time text filter at the top of the sidebar
9. **Real-time updates** — tree updates automatically when files are created, deleted, or renamed in the workspace
10. **Mobile responsive** — hamburger toggle button to show/hide sidebar on small screens

### Non-Functional

- Sidebar width: 260px fixed on desktop
- Debounce file watcher events: 300ms
- Maximum tree depth: unlimited (typical project sizes)
- Permission errors: skip gracefully, log warning
- Symlink loops: detect and skip via realpath tracking

## Architecture

### Components

```
┌─────────────────────────────────────────┐
│  VS Code Extension (src/extension.ts)   │
│  ├─ Reads settings                      │
│  ├─ Creates file system watcher         │
│  └─ Triggers tree rebuild on changes    │
└─────────────────┬───────────────────────┘
                  │ debounced 300ms
                  ▼
┌─────────────────────────────────────────┐
│  MarkdownLiveServer (src/server.ts)     │
│  ├─ Stores siteTree: TreeNode[]         │
│  ├─ rebuildSiteTree()                   │
│  └─ broadcastTreeUpdate()               │
└─────────────────┬───────────────────────┘
                  │ WebSocket
                  ▼
┌─────────────────────────────────────────┐
│  Browser Client                         │
│  ├─ Receives treeUpdate messages        │
│  ├─ Renders tree from JSON              │
│  ├─ Manages expand/collapse state       │
│  ├─ Filters by search query             │
│  └─ Highlights active file              │
└─────────────────────────────────────────┘
```

### Data Flow

1. Server starts → calls `rebuildSiteTree()` → scans directory → stores tree
2. Template renders page → embeds tree JSON as `window.__SITE_TREE__`
3. Client JS renders sidebar from embedded JSON
4. File changes in workspace → extension watcher fires → calls `rebuildSiteTree()`
5. Server broadcasts `treeUpdate` via WebSocket
6. Client receives update → re-renders tree → restores expand state from localStorage

## Data Structures

### TreeNode

```typescript
interface TreeNode {
  name: string;        // Display name (basename)
  path: string;        // Request path (e.g., /docs/guide.md)
  type: 'file' | 'directory';
  children?: TreeNode[];
}
```

### WebSocket Messages

```typescript
interface TreeUpdateMessage {
  type: 'treeUpdate';
  tree: TreeNode[];
}
```

### VS Code Settings

```json
{
  "mdLiveServer.siteMenu.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable site menu sidebar"
  },
  "mdLiveServer.siteMenu.include": {
    "type": "array",
    "items": { "type": "string" },
    "default": ["*"],
    "description": "Glob patterns for files to include in menu"
  },
  "mdLiveServer.siteMenu.exclude": {
    "type": "array",
    "items": { "type": "string" },
    "default": [".*", "node_modules"],
    "description": "Glob patterns for files to exclude from menu"
  }
}

Pattern matching is simple: patterns match against the **basename** of files/folders (not full path). `*` is a wildcard matching any sequence of characters. Exact names match exactly. Multiple include patterns use OR logic (match any). Multiple exclude patterns use OR logic (exclude if match any). Exclude is applied after include.
```

## Server-Side Changes

### src/tree.ts (new)

Pure function `scanDirectory(rootPath, options)`:
- Reads directory recursively
- Applies include/exclude patterns
- Sorts: directories first, then files, alphabetically within each
- Returns `TreeNode[]`
- Handles permission errors gracefully
- Detects symlink loops via realpath tracking

### src/server.ts

Changes:
- Add `private siteTree: TreeNode[] = []`
- Add `private siteMenuOptions: SiteMenuOptions`
- Add `rebuildSiteTree(): void` — calls `scanDirectory`, stores result, returns
- Add `broadcastTreeUpdate(): void` — sends `treeUpdate` to all WebSocket clients
- In `start()`: call `rebuildSiteTree()` after server starts
- Constructor: accept `siteMenuOptions` from extension
- `renderMarkdownPage` and `renderHtmlPage`: pass `siteTree` to template

### src/template.ts

Changes to `renderMarkdownPage`:
- If `siteMenu.enabled` is `false`: render page without any sidebar (current behavior)
- If `siteMenu.enabled` is `true`:
  - Wrap body in flexbox layout: `<aside id="site-menu">` + `<main id="content">`
  - Add CSS for sidebar: 260px width, border-right, overflow-y auto
  - Embed tree JSON: `<script>window.__SITE_TREE__ = ${JSON.stringify(siteTree)}</script>`
  - Add client JS module for tree rendering, search, expand/collapse, highlight
  - Add hamburger toggle button for mobile

Changes to `renderHtmlPage`:
- If `siteMenu.enabled` is `false`: inject only existing reload script (current behavior)
- If `siteMenu.enabled` is `true`: inject sidebar layout + tree JS alongside existing reload script

## Client-Side JavaScript

Embedded in template, runs on page load:

1. **Tree rendering**: Recursively builds `<ul>/<li>` DOM from `window.__SITE_TREE__`
   - Folder items have toggle icon (`▶`/`▼`)
   - File items have link to their path
   
2. **Expand/collapse**: Click toggle icon or folder name
   - State stored in `localStorage` as JSON array of expanded paths
   - Key: `md-live-server-tree-state`
   
3. **Auto-expand on load**: Automatically expand all parent folders of the active file

4. **Active file highlight**: Compare `location.pathname` with `node.path`
   - Add `active` class (bold + link color)
   - Scroll into view if needed
   
5. **Search/filter**: Input at top of sidebar
   - Real-time filtering as user types
   - Case-insensitive substring match on `node.name`
   - When filtering, auto-expand folders containing matches
   - Show "no results" message when empty
   
6. **WebSocket treeUpdate handler**: 
   - Re-render tree with new data
   - Restore expand state from localStorage
   - Maintain active highlight
   - Maintain search filter if active
   
7. **Mobile toggle**: Hamburger button (☰)
   - Toggles sidebar visibility
   - Sidebar overlays content on mobile
   - Dark overlay behind sidebar when open

## Extension-Side Changes

### src/extension.ts

Changes:
- In `startServer`:
  - Read settings: `vscode.workspace.getConfiguration('mdLiveServer.siteMenu')`
  - Pass settings to `MarkdownLiveServer` constructor
  - Create file system watcher: `vscode.workspace.createFileSystemWatcher('**/*')`
  - On `onDidCreate`, `onDidDelete`, `onDidChange`:
    - Check if path is inside `liveRootPath`
    - Debounce (300ms) calls to `liveServer.rebuildSiteTree()` + `liveServer.broadcastTreeUpdate()`
  - Store watcher reference, dispose in `stopServer`
- In `stopServer`: dispose file watcher

## Error Handling

| Scenario | Behavior |
|---|---|
| Permission denied (EACCES) | Log warning, skip folder, continue scanning |
| Symlink loop | Track visited realpaths in Set, skip if seen |
| Malformed settings | Fallback to defaults (enabled=true, include=["*"], exclude=[".*", "node_modules"]) |
| Empty workspace | Render empty tree |
| Very large directory | No artificial limit; rely on OS limits |

## Testing

### Unit Tests

1. `scanDirectory`:
   - Empty directory → returns empty array
   - Nested directories → correct hierarchy
   - Hidden files → excluded by default
   - Include/exclude patterns → correct filtering
   - Symlinks → handled correctly
   - Sorting → directories before files, alphabetical

2. Pattern matching:
   - `*` matches all names
   - `.*` matches hidden files/folders
   - `node_modules` matches exact name
   - Multiple patterns → OR logic for include, AND logic for exclude

### Integration Tests

1. WebSocket:
   - `treeUpdate` message broadcast when file added
   - `treeUpdate` message broadcast when file deleted
   - Client receives and re-renders tree

2. Template:
   - `renderMarkdownPage` contains `window.__SITE_TREE__`
   - `renderHtmlPage` contains sidebar when tree provided

## Open Questions

None. All requirements clarified during brainstorming.
