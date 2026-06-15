# Preview UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Markdown Live Server preview a polished, modern UI: a branded sidebar with Theme + Code-Theme selectors, a main-view header bar (path crumb · Print · Edit · light/dark), and a CodeMirror 6 in-browser editor that writes back to disk from loopback only.

**Architecture:** A new pure-data module `src/themes.ts` holds the palette catalog (5 content palettes × light/dark) and the highlight.js code-theme catalog. `src/template.ts`'s `renderMarkdownPage` is rewritten to assemble the new chrome, theme system, and (when `editable`) the editor assets; it gains an `editable` 5th param. `src/server.ts` adds two loopback-guarded Express routes (`GET /__mdls__/source`, `POST /__mdls__/save`) registered before the catch-all, and passes `editable: true` for `.md` file pages. All client behavior is inline scripts served in the page (consistent with the existing template), and CodeMirror/markdown-it load from CDN with graceful fallback (consistent with the existing Mermaid/highlight.js loading).

**Tech Stack:** TypeScript, Express, `ws`, markdown-it (server + CDN client), CodeMirror 6 (CDN ESM), highlight.js + Mermaid (CDN), vitest.

**Spec:** [docs/superpowers/specs/2026-06-15-preview-ui-redesign-design.md](../specs/2026-06-15-preview-ui-redesign-design.md)

---

## File Structure

- **Create** `src/themes.ts` — `ContentTheme`/`CodeTheme` types, `CONTENT_THEMES`, `CODE_THEMES`, `DEFAULT_CONTENT_THEME`, `DEFAULT_CODE_THEME`, `buildThemeCss()`, `codeThemeHref()`.
- **Create** `test/themes.test.ts` — catalog + helper tests.
- **Modify** `src/server.ts` — export `isLoopback()`; add `express.json()` and the two `__mdls__` routes before `app.get('*')`; pass `editable: true` to `renderMarkdownPage` for `.md` files.
- **Modify** `test/server.test.ts` — `isLoopback` unit tests + edit-endpoint integration tests.
- **Modify** `src/template.ts` — import from `./themes`; rewrite `renderMarkdownPage` (new param + chrome + theme system + editor assets). `renderHtmlPage`, `renderDirectoryPage`, `renderDirectoryMarkdownPage`, `escapeHtml`, `escapeAttribute` unchanged.
- **Modify** `test/template.test.ts` — add chrome + editor assertions (keep existing assertions intact).

---

## Task 1: Theme catalog module

**Files:**
- Create: `src/themes.ts`
- Test: `test/themes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/themes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  CONTENT_THEMES,
  CODE_THEMES,
  buildThemeCss,
  codeThemeHref,
  DEFAULT_CONTENT_THEME,
  DEFAULT_CODE_THEME,
} from '../src/themes';

describe('CODE_THEMES', () => {
  it('every entry has id, label, and a jsdelivr highlight.js href', () => {
    expect(CODE_THEMES.length).toBeGreaterThan(0);
    for (const t of CODE_THEMES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.href).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/highlight\.js@11\/styles\/.+\.css$/);
    }
  });

  it('contains the default code theme', () => {
    expect(CODE_THEMES.some((t) => t.id === DEFAULT_CODE_THEME)).toBe(true);
  });
});

describe('CONTENT_THEMES', () => {
  const keys = ['bg', 'fg', 'muted', 'border', 'codeBg', 'link', 'sidebarBg', 'headerBg', 'accent'] as const;

  it('every palette defines all vars for light and dark', () => {
    expect(CONTENT_THEMES.length).toBeGreaterThan(0);
    for (const theme of CONTENT_THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        for (const k of keys) {
          expect(theme[mode][k], `${theme.id}.${mode}.${k}`).toBeTruthy();
        }
      }
    }
  });

  it('contains the default content theme', () => {
    expect(CONTENT_THEMES.some((t) => t.id === DEFAULT_CONTENT_THEME)).toBe(true);
  });
});

describe('buildThemeCss', () => {
  it('emits a selector per theme per mode', () => {
    const css = buildThemeCss();
    for (const theme of CONTENT_THEMES) {
      expect(css).toContain(`[data-theme="${theme.id}"][data-mode="light"]`);
      expect(css).toContain(`[data-theme="${theme.id}"][data-mode="dark"]`);
    }
  });
});

describe('codeThemeHref', () => {
  it('returns the href for a known id', () => {
    const gh = CODE_THEMES.find((t) => t.id === 'github')!;
    expect(codeThemeHref('github')).toBe(gh.href);
  });

  it('falls back to the default for an unknown id', () => {
    expect(codeThemeHref('does-not-exist')).toBe(codeThemeHref(DEFAULT_CODE_THEME));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- themes`
Expected: FAIL — `Cannot find module '../src/themes'`.

- [ ] **Step 3: Write the implementation**

Create `src/themes.ts`:

```ts
export interface ThemeVars {
  bg: string;
  fg: string;
  muted: string;
  border: string;
  codeBg: string;
  link: string;
  sidebarBg: string;
  headerBg: string;
  accent: string;
}

export interface ContentTheme {
  id: string;
  label: string;
  light: ThemeVars;
  dark: ThemeVars;
}

export interface CodeTheme {
  id: string;
  label: string;
  href: string;
}

export const DEFAULT_CONTENT_THEME = 'modern';
export const DEFAULT_CODE_THEME = 'github-dark';

export const CONTENT_THEMES: ContentTheme[] = [
  {
    id: 'modern',
    label: 'Modern',
    light: { bg: '#ffffff', fg: '#24292f', muted: '#57606a', border: '#d0d7de', codeBg: '#f6f8fa', link: '#0969da', sidebarBg: '#f6f8fa', headerBg: '#ffffff', accent: '#0969da' },
    dark: { bg: '#0d1117', fg: '#c9d1d9', muted: '#8b949e', border: '#30363d', codeBg: '#161b22', link: '#58a6ff', sidebarBg: '#0d1117', headerBg: '#161b22', accent: '#1f6feb' },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    light: { bg: '#ffffff', fg: '#1e1b3a', muted: '#6b6792', border: '#e0ddf0', codeBg: '#f4f2fb', link: '#6d28d9', sidebarBg: '#f7f5fd', headerBg: '#ffffff', accent: '#7c3aed' },
    dark: { bg: '#0f0a23', fg: '#e6e1ff', muted: '#9d97c7', border: '#2a2350', codeBg: '#181238', link: '#b794f6', sidebarBg: '#140d2e', headerBg: '#1a1340', accent: '#9f7aea' },
  },
  {
    id: 'forest',
    label: 'Forest',
    light: { bg: '#fbfdfb', fg: '#1b3a2b', muted: '#5a7a68', border: '#d4e4d8', codeBg: '#eef5ef', link: '#15803d', sidebarBg: '#f1f7f2', headerBg: '#ffffff', accent: '#16a34a' },
    dark: { bg: '#0c1a12', fg: '#cfe9d8', muted: '#7fa890', border: '#1f3a2a', codeBg: '#11241a', link: '#4ade80', sidebarBg: '#0f2016', headerBg: '#14291c', accent: '#22c55e' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    light: { bg: '#ffffff', fg: '#1a2238', muted: '#5b6480', border: '#d6dcec', codeBg: '#f2f4fb', link: '#2563eb', sidebarBg: '#f4f6fc', headerBg: '#ffffff', accent: '#3b82f6' },
    dark: { bg: '#060a18', fg: '#c7d2ed', muted: '#7b86a8', border: '#1c2540', codeBg: '#0d1428', link: '#60a5fa', sidebarBg: '#0a1024', headerBg: '#0f1730', accent: '#3b82f6' },
  },
  {
    id: 'ghibli',
    label: 'Ghibli',
    light: { bg: '#fdfcf7', fg: '#4a3f2f', muted: '#8a7a5e', border: '#e8e0cf', codeBg: '#f5f0e3', link: '#b45309', sidebarBg: '#f7f2e7', headerBg: '#fffdf7', accent: '#d97706' },
    dark: { bg: '#1f1b14', fg: '#ece3d0', muted: '#a89a7c', border: '#3a3424', codeBg: '#2a2418', link: '#fbbf24', sidebarBg: '#241f16', headerBg: '#2c2619', accent: '#f59e0b' },
  },
];

const HLJS_BASE = 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/';

export const CODE_THEMES: CodeTheme[] = [
  { id: 'github-dark', label: 'GitHub Dark', href: `${HLJS_BASE}github-dark.min.css` },
  { id: 'github', label: 'GitHub', href: `${HLJS_BASE}github.min.css` },
  { id: 'atom-one-dark', label: 'Atom One Dark', href: `${HLJS_BASE}atom-one-dark.min.css` },
  { id: 'atom-one-light', label: 'Atom One Light', href: `${HLJS_BASE}atom-one-light.min.css` },
  { id: 'dracula', label: 'Dracula', href: `${HLJS_BASE}base16/dracula.min.css` },
  { id: 'nord', label: 'Nord', href: `${HLJS_BASE}nord.min.css` },
  { id: 'monokai', label: 'Monokai', href: `${HLJS_BASE}monokai.min.css` },
  { id: 'vs2015', label: 'VS 2015', href: `${HLJS_BASE}vs2015.min.css` },
  { id: 'vs', label: 'VS', href: `${HLJS_BASE}vs.min.css` },
  { id: 'tokyo-night-dark', label: 'Tokyo Night Dark', href: `${HLJS_BASE}tokyo-night-dark.min.css` },
  { id: 'tokyo-night-light', label: 'Tokyo Night Light', href: `${HLJS_BASE}tokyo-night-light.min.css` },
  { id: 'a11y-dark', label: 'A11y Dark', href: `${HLJS_BASE}base16/atelier-forest.min.css` },
  { id: 'a11y-light', label: 'A11y Light', href: `${HLJS_BASE}base16/atelier-forest-light.min.css` },
];

function varsToCss(v: ThemeVars): string {
  return [
    `--bg:${v.bg}`,
    `--fg:${v.fg}`,
    `--muted:${v.muted}`,
    `--border:${v.border}`,
    `--code-bg:${v.codeBg}`,
    `--link:${v.link}`,
    `--sidebar-bg:${v.sidebarBg}`,
    `--header-bg:${v.headerBg}`,
    `--accent:${v.accent}`,
  ].join(';');
}

export function buildThemeCss(): string {
  const def = CONTENT_THEMES.find((t) => t.id === DEFAULT_CONTENT_THEME) ?? CONTENT_THEMES[0];
  const blocks: string[] = [`:root{color-scheme:light dark;${varsToCss(def.light)}}`];
  for (const theme of CONTENT_THEMES) {
    blocks.push(`:root[data-theme="${theme.id}"][data-mode="light"]{${varsToCss(theme.light)}}`);
    blocks.push(`:root[data-theme="${theme.id}"][data-mode="dark"]{${varsToCss(theme.dark)}}`);
  }
  return blocks.join('\n');
}

export function codeThemeHref(id: string): string {
  const found =
    CODE_THEMES.find((t) => t.id === id) ??
    CODE_THEMES.find((t) => t.id === DEFAULT_CODE_THEME) ??
    CODE_THEMES[0];
  return found.href;
}
```

> Note: the unit test only checks each `href`'s URL *shape*, not reachability. Several highlight.js@11 themes live under `styles/base16/` (e.g. `dracula`), and `a11y-dark`/`a11y-light` are not published under `styles/` at all — the closest base16 stylesheets are substituted so every entry resolves on jsDelivr. During Task 4 manual QA, switch through every Code Theme and confirm the code block actually restyles (a 404 leaves it unchanged); fix any 404 `href` by browsing `https://cdn.jsdelivr.net/npm/highlight.js@11/styles/` and adjusting the path.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- themes`
Expected: PASS (all `themes.test.ts` cases green).

- [ ] **Step 5: Commit**

```bash
git add src/themes.ts test/themes.test.ts
git commit -m "feat: add content + code theme catalogs"
```

---

## Task 2: Loopback-guarded edit endpoints

**Files:**
- Modify: `src/server.ts`
- Test: `test/server.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the top of `test/server.test.ts` imports (modify the existing import line):

```ts
import { MarkdownLiveServer, isLoopback } from '../src/server';
```

Append these `describe` blocks to `test/server.test.ts`:

```ts
describe('isLoopback', () => {
  it('accepts loopback addresses', () => {
    expect(isLoopback('127.0.0.1')).toBe(true);
    expect(isLoopback('::1')).toBe(true);
    expect(isLoopback('::ffff:127.0.0.1')).toBe(true);
  });

  it('rejects non-loopback and undefined', () => {
    expect(isLoopback('203.0.113.5')).toBe(false);
    expect(isLoopback('192.168.1.10')).toBe(false);
    expect(isLoopback(undefined)).toBe(false);
  });
});

describe('edit endpoints', () => {
  let tmpDir: string;
  let server: MarkdownLiveServer;
  let port: number;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-live-edit-'));
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# A');
    fs.writeFileSync(path.join(tmpDir, 'note.txt'), 'plain');
    server = new MarkdownLiveServer({ rootPath: tmpDir, entryPath: path.join(tmpDir, 'a.md') });
    port = await server.start();
  });

  afterAll(async () => {
    await server.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET source returns raw markdown for a valid path', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/__mdls__/source?path=${encodeURIComponent('/a.md')}`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { content: string };
    expect(json.content).toBe('# A');
  });

  it('GET source rejects non-markdown paths', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/__mdls__/source?path=${encodeURIComponent('/note.txt')}`);
    expect(res.status).toBe(404);
  });

  it('POST save writes the file and returns ok', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/__mdls__/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/a.md', content: '# Changed' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, 'a.md'), 'utf8')).toBe('# Changed');
  });

  it('POST save rejects path traversal', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/__mdls__/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/../escape.md', content: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  it('POST save rejects an invalid body', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/__mdls__/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/a.md' }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server`
Expected: FAIL — `isLoopback` is not exported; the `/__mdls__/*` requests return 404 (Express falls through to the catch-all).

- [ ] **Step 3: Implement the endpoints**

In `src/server.ts`, add this exported helper just below the imports (before `export interface MarkdownLiveServerOptions`):

```ts
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isLoopback(remoteAddress?: string): boolean {
  return remoteAddress !== undefined && LOOPBACK_ADDRESSES.has(remoteAddress);
}
```

In `start()`, immediately **after** `const app = express();` and **before** the existing `app.get('*', ...)` block, insert:

```ts
    app.use(express.json({ limit: '5mb' }));

    app.get('/__mdls__/source', (request, response) => {
      if (!isLoopback(request.socket.remoteAddress)) {
        response.status(403).json({ error: 'forbidden' });
        return;
      }
      const reqPath = typeof request.query.path === 'string' ? request.query.path : '';
      const filePath = this.resolveRequestPath(reqPath);
      if (!filePath || path.extname(filePath).toLowerCase() !== '.md') {
        response.status(404).json({ error: 'not found' });
        return;
      }
      try {
        if (fs.statSync(filePath).isDirectory()) {
          response.status(404).json({ error: 'not a file' });
          return;
        }
        response.json({ content: fs.readFileSync(filePath, 'utf8') });
      } catch {
        response.status(404).json({ error: 'not found' });
      }
    });

    app.post('/__mdls__/save', (request, response) => {
      if (!isLoopback(request.socket.remoteAddress)) {
        response.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = request.body as { path?: unknown; content?: unknown };
      if (typeof body?.path !== 'string' || typeof body?.content !== 'string') {
        response.status(400).json({ error: 'invalid body' });
        return;
      }
      const filePath = this.resolveRequestPath(body.path);
      if (!filePath || path.extname(filePath).toLowerCase() !== '.md') {
        response.status(404).json({ error: 'not found' });
        return;
      }
      try {
        if (fs.statSync(filePath).isDirectory()) {
          response.status(400).json({ error: 'not a file' });
          return;
        }
        fs.writeFileSync(filePath, body.content, 'utf8');
        this.broadcastChange(filePath, body.content);
        response.json({ ok: true });
      } catch (error) {
        response.status(500).json({ error: error instanceof Error ? error.message : 'write failed' });
      }
    });
```

Then update the `.md` branch of the existing `app.get('*', ...)` handler to pass `editable: true`. Replace:

```ts
      if (path.extname(filePath).toLowerCase() === '.md') {
        response.send(renderMarkdownPage(
          this.renderMarkdownFile(filePath),
          path.basename(filePath),
          this.currentPort(),
          this.siteMenuOptions ? this.siteTree : undefined
        ));
        return;
      }
```

with:

```ts
      if (path.extname(filePath).toLowerCase() === '.md') {
        response.send(renderMarkdownPage(
          this.renderMarkdownFile(filePath),
          path.basename(filePath),
          this.currentPort(),
          this.siteMenuOptions ? this.siteTree : undefined,
          true
        ));
        return;
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server`
Expected: PASS (existing `resolveRequestPath`/`broadcastChange`/`broadcastTreeUpdate` cases plus the new `isLoopback` and `edit endpoints` cases).

- [ ] **Step 5: Commit**

```bash
git add src/server.ts test/server.test.ts
git commit -m "feat: add loopback-guarded source/save edit endpoints"
```

---

## Task 3: Rewrite renderMarkdownPage (chrome, theme system, editor)

**Files:**
- Modify: `src/template.ts`
- Test: `test/template.test.ts`

This task replaces the `renderMarkdownPage` function and adds the `./themes` import. Everything else in `template.ts` stays. `renderDirectoryMarkdownPage` keeps calling `renderMarkdownPage(content, title, port, siteTree)` (no 5th arg → `editable` defaults to `false`), so directory listings get the new chrome but no editor.

- [ ] **Step 1: Write the failing tests**

Add these cases to `test/template.test.ts` inside the existing `describe('renderMarkdownPage', ...)` block (keep the existing three cases unchanged):

```ts
  it('renders the header bar, branding, and theme selectors with a sidebar', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', 3000, tree, true);
    expect(html).toContain('id="app-header"');
    expect(html).toContain('Md Live Server');
    expect(html).toContain('id="content-theme-select"');
    expect(html).toContain('id="code-theme-select"');
    expect(html).toContain('data-mode-toggle');
    expect(html).toContain('id="print-btn"');
  });

  it('includes editor assets when editable', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', 3000, tree, true);
    expect(html).toContain('id="md-editor"');
    expect(html).toContain('id="edit-btn"');
    expect(html).toContain('__mdls__/save');
  });

  it('omits editor assets when not editable', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', 3000, tree, false);
    expect(html).not.toContain('id="md-editor"');
    expect(html).not.toContain('id="edit-btn"');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- template`
Expected: FAIL — `id="app-header"`, `id="content-theme-select"`, etc. not found (and the existing cases still pass).

- [ ] **Step 3: Implement — add the import**

At the top of `src/template.ts`, add after the existing `import type { TreeNode } from './tree';` line:

```ts
import {
  CONTENT_THEMES,
  CODE_THEMES,
  buildThemeCss,
  codeThemeHref,
  DEFAULT_CONTENT_THEME,
  DEFAULT_CODE_THEME,
} from './themes';
```

- [ ] **Step 4: Implement — replace `renderMarkdownPage`**

Replace the **entire** existing `renderMarkdownPage` function (from `export function renderMarkdownPage(` through its closing `}` before `export function renderHtmlPage`) with the following:

```ts
export function renderMarkdownPage(
  content: string,
  title: string,
  port: number,
  siteTree?: TreeNode[],
  editable: boolean = false
): string {
  const hasSidebar = siteTree !== undefined && siteTree.length > 0;

  const ICON_MENU = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3.75A.75.75 0 0 1 1.75 3h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 3.75Zm0 4A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 11h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"/></svg>';
  const ICON_FILE = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237V14.25A1.75 1.75 0 0 1 12.25 16h-8.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5Zm5.75.56v2.19c0 .138.112.25.25.25h2.19Z"/></svg>';
  const ICON_PRINT = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75V3h1.25A1.75 1.75 0 0 1 14 4.75v4.5A1.75 1.75 0 0 1 12.25 11H11v3.25a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75V11H3.75A1.75 1.75 0 0 1 2 9.25v-4.5A1.75 1.75 0 0 1 3.75 3H5Zm1.5 1.25h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Zm0 8.5v2.25h3V11.5Zm-1.5-1.5h6V4.75a.25.25 0 0 0-.25-.25H3.75a.25.25 0 0 0-.25.25v4.5c0 .138.112.25.25.25Z"/></svg>';
  const ICON_EDIT = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"/></svg>';
  const ICON_LOGO = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15v-7.7C16 3.52 15.48 3 14.85 3ZM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6Zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5Z"/></svg>';

  const contentOptions = CONTENT_THEMES
    .map((t) => `<option value="${escapeAttribute(t.id)}">${escapeHtml(t.label)}</option>`)
    .join('');
  const codeOptions = CODE_THEMES
    .map((t) => `<option value="${escapeAttribute(t.id)}">${escapeHtml(t.label)}</option>`)
    .join('');

  const mdlsData = JSON.stringify({
    codeThemes: CODE_THEMES.map((t) => ({ id: t.id, href: t.href })),
    contentDefault: DEFAULT_CONTENT_THEME,
    codeDefault: DEFAULT_CODE_THEME,
  }).replace(/</g, '\\u003c');

  const pageStyles = `
    ${buildThemeCss()}
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: var(--fg); background: var(--bg); }
    body.has-sidebar { padding-left: 260px; }
    body.has-sidebar.collapsed { padding-left: 0; }
    a { color: var(--link); }
    pre { overflow: auto; padding: 1rem; background: var(--code-bg); border-radius: 6px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    blockquote { margin-left: 0; padding-left: 1rem; color: var(--muted); border-left: 4px solid var(--border); }
    img { max-width: 100%; }
    table { border-collapse: collapse; }
    th, td { padding: 0.4rem 0.7rem; border: 1px solid var(--border); }

    #app-header { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--header-bg); border-bottom: 1px solid var(--border); }
    .header-path { display: flex; align-items: center; gap: 0.4rem; color: var(--muted); font-size: 0.9rem; min-width: 0; }
    .header-path svg { width: 1rem; height: 1rem; flex: none; }
    #header-path-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .header-spacer { flex: 1 1 auto; }
    .icon-btn { display: inline-grid; place-items: center; width: 2rem; height: 2rem; color: var(--fg); background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 0; cursor: pointer; }
    .icon-btn:hover { background: var(--code-bg); border-color: var(--border); }
    .icon-btn svg { width: 1.05rem; height: 1.05rem; }
    .mode-icon { font-size: 1rem; line-height: 1; }

    #content { margin: 0 auto; padding: 2rem; max-width: 980px; }

    #site-menu { position: fixed; top: 0; left: 0; width: 260px; height: 100vh; border-right: 1px solid var(--border); background: var(--sidebar-bg); z-index: 100; box-sizing: border-box; transition: transform 0.2s; display: flex; flex-direction: column; padding: 1rem; }
    #site-menu.collapsed { transform: translateX(-260px); }
    .menu-brand { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 1rem; padding-bottom: 0.75rem; color: var(--fg); }
    .menu-brand svg { width: 1.4rem; height: 1.4rem; color: var(--accent); }
    #site-menu-search { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--fg); margin-bottom: 0.5rem; box-sizing: border-box; font-size: 0.875rem; }
    #site-menu-tree { flex: 1 1 auto; overflow-y: auto; font-size: 0.875rem; }
    #site-menu-tree ul { list-style: none; padding: 0; margin: 0; }
    #site-menu-tree ul ul { padding-left: 0.75rem; }
    #site-menu-tree li { margin: 0.1rem 0; }
    #site-menu-tree a { text-decoration: none; display: flex; align-items: center; gap: 0.35rem; padding: 0.15rem 0.35rem; border-radius: 4px; color: var(--fg); }
    #site-menu-tree a:hover { color: var(--link); }
    #site-menu-tree a.active { font-weight: 600; color: var(--accent); background: var(--code-bg); }
    #site-menu-tree .node-icon { display: inline-flex; color: var(--muted); }
    #site-menu-tree .node-icon svg { width: 0.85rem; height: 0.85rem; }
    .menu-folder { display: flex; align-items: center; gap: 0.35rem; cursor: pointer; padding: 0.15rem 0.35rem; border-radius: 4px; }
    .menu-folder:hover { background: var(--code-bg); }
    .menu-folder .chev { color: var(--muted); font-size: 0.7rem; width: 0.8rem; user-select: none; }
    .menu-footer { border-top: 1px solid var(--border); padding-top: 0.75rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .menu-field { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); }
    .menu-field select { text-transform: none; letter-spacing: normal; padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--fg); font-size: 0.8rem; }
    .mode-toggle-btn { display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--fg); cursor: pointer; font-size: 0.8rem; }
    .mode-toggle-btn:hover { background: var(--code-bg); }

    #md-editor { padding: 0; }
    #md-editor[hidden] { display: none; }
    .editor-toolbar { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-bottom: 1px solid var(--border); }
    .editor-status { flex: 1 1 auto; color: var(--muted); font-size: 0.85rem; }
    .editor-btn { padding: 0.35rem 0.8rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--fg); cursor: pointer; font-size: 0.85rem; }
    .editor-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .editor-split { display: grid; grid-template-columns: 1fr 1fr; gap: 0; height: calc(100vh - 96px); }
    #editor-input { overflow: auto; border-right: 1px solid var(--border); }
    #editor-input .cm-editor { height: 100%; }
    .editor-fallback { width: 100%; height: 100%; border: 0; padding: 1rem; resize: none; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9rem; background: var(--bg); color: var(--fg); }
    #editor-preview { overflow: auto; padding: 1rem 1.5rem; }

    @media (max-width: 768px) {
      body.has-sidebar { padding-left: 0 !important; }
      #site-menu { transform: translateX(-100%); }
      #site-menu.open { transform: translateX(0); }
      #site-menu.collapsed { transform: translateX(-100%); }
      #content { padding: 1rem; }
      .editor-split { grid-template-columns: 1fr; height: auto; }
    }
    @media print {
      body.has-sidebar { padding-left: 0 !important; }
      #site-menu, #app-header, #md-editor { display: none !important; }
      #content { max-width: none; padding: 0; }
    }
  `;

  const headerHtml = `
    <header id="app-header">
      ${hasSidebar ? `<button id="site-menu-toggle" class="icon-btn" type="button" aria-label="Toggle menu">${ICON_MENU}</button>` : ''}
      <span class="header-path">${ICON_FILE}<span id="header-path-text"></span></span>
      <span class="header-spacer"></span>
      <button id="print-btn" class="icon-btn" type="button" title="Print" aria-label="Print">${ICON_PRINT}</button>
      ${editable ? `<button id="edit-btn" class="icon-btn" type="button" title="Edit" aria-label="Edit">${ICON_EDIT}</button>` : ''}
      <button class="icon-btn mode-toggle-btn" data-mode-toggle type="button" title="Toggle light/dark" aria-label="Toggle light/dark"><span class="mode-icon"></span></button>
    </header>
  `;

  const sidebarHtml = hasSidebar ? `
    <aside id="site-menu">
      <div class="menu-brand">${ICON_LOGO}<span>Md Live Server</span></div>
      <input type="text" id="site-menu-search" placeholder="Search files..." autocomplete="off">
      <div id="site-menu-tree"></div>
      <div class="menu-footer">
        <label class="menu-field"><span>Theme</span>
          <select id="content-theme-select">${contentOptions}</select>
        </label>
        <label class="menu-field"><span>Code Theme</span>
          <select id="code-theme-select">${codeOptions}</select>
        </label>
        <button class="mode-toggle-btn" data-mode-toggle type="button"><span class="mode-icon"></span><span class="mode-label"></span></button>
      </div>
    </aside>
  ` : '';

  const editorHtml = editable ? `
    <div id="md-editor" hidden>
      <div class="editor-toolbar">
        <span class="editor-status" id="editor-status"></span>
        <button id="editor-cancel" class="editor-btn" type="button">Cancel</button>
        <button id="editor-save" class="editor-btn primary" type="button">Save</button>
      </div>
      <div class="editor-split">
        <div id="editor-input"></div>
        <div id="editor-preview" class="markdown-body"></div>
      </div>
    </div>
  ` : '';

  const sidebarScript = hasSidebar ? `
    <script>
    (function() {
      const TREE_STATE_KEY = 'md-live-server-tree-state';
      const FILE_ICON = '${ICON_FILE.replace(/'/g, "\\'")}';
      const FOLDER_OPEN = '▾';
      const FOLDER_CLOSED = '▸';
      let currentTree = ${JSON.stringify(siteTree).replace(/</g, '\\u003c')};

      function loadExpandedState() {
        try { return new Set(JSON.parse(localStorage.getItem(TREE_STATE_KEY) || '[]')); }
        catch { return new Set(); }
      }
      function saveExpandedState(expanded) {
        localStorage.setItem(TREE_STATE_KEY, JSON.stringify([...expanded]));
      }
      function shouldShowNode(node, query) {
        if (!query) return true;
        if (node.name.toLowerCase().includes(query)) return true;
        if (node.type === 'directory' && node.children) return node.children.some(c => shouldShowNode(c, query));
        return false;
      }
      function renderTree(nodes, expanded, container, depth, query) {
        if (!nodes || nodes.length === 0) return;
        const ul = document.createElement('ul');
        ul.style.paddingLeft = depth === 0 ? '0' : '0.75rem';
        for (const node of nodes) {
          if (!shouldShowNode(node, query)) continue;
          const li = document.createElement('li');
          if (node.type === 'directory') {
            const isExpanded = expanded.has(node.path) || !!query;
            const folderDiv = document.createElement('div');
            folderDiv.className = 'menu-folder';
            const chev = document.createElement('span');
            chev.className = 'chev';
            chev.textContent = isExpanded ? FOLDER_OPEN : FOLDER_CLOSED;
            const nameSpan = document.createElement('span');
            nameSpan.textContent = node.name;
            folderDiv.appendChild(chev);
            folderDiv.appendChild(nameSpan);
            li.appendChild(folderDiv);
            if (node.children && isExpanded) renderTree(node.children, expanded, li, depth + 1, query);
            const toggleHandler = (e) => {
              e.preventDefault();
              if (expanded.has(node.path)) expanded.delete(node.path);
              else expanded.add(node.path);
              saveExpandedState(expanded);
              refreshSidebar();
            };
            folderDiv.addEventListener('click', toggleHandler);
          } else {
            const link = document.createElement('a');
            link.href = node.path;
            const icon = document.createElement('span');
            icon.className = 'node-icon';
            icon.innerHTML = FILE_ICON;
            link.appendChild(icon);
            link.appendChild(document.createTextNode(node.name));
            if (node.path === location.pathname) link.className = 'active';
            li.appendChild(link);
          }
          ul.appendChild(li);
        }
        if (ul.children.length > 0) container.appendChild(ul);
      }
      function refreshSidebar() {
        const sidebar = document.getElementById('site-menu-tree');
        if (!sidebar) return;
        sidebar.innerHTML = '';
        const expanded = loadExpandedState();
        const query = document.getElementById('site-menu-search')?.value.toLowerCase() || '';
        renderTree(currentTree, expanded, sidebar, 0, query);
      }
      function initSidebar() {
        const searchInput = document.getElementById('site-menu-search');
        if (searchInput) searchInput.addEventListener('input', refreshSidebar);
        const expanded = loadExpandedState();
        const activePath = location.pathname;
        function findAndExpand(nodes) {
          for (const node of nodes) {
            if (node.type === 'directory' && node.children) {
              for (const child of node.children) {
                if (child.path === activePath) { expanded.add(node.path); return true; }
                if (child.type === 'directory' && findAndExpand([child])) { expanded.add(node.path); return true; }
              }
            }
          }
          return false;
        }
        findAndExpand(currentTree);
        saveExpandedState(expanded);
        refreshSidebar();

        const menuToggle = document.getElementById('site-menu-toggle');
        const siteMenu = document.getElementById('site-menu');
        if (menuToggle && siteMenu) {
          const collapsedKey = 'md-live-server-menu-collapsed';
          if (localStorage.getItem(collapsedKey) === 'true') {
            siteMenu.classList.add('collapsed');
            document.body.classList.add('collapsed');
          }
          menuToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
              siteMenu.classList.toggle('open');
            } else {
              const nowCollapsed = !siteMenu.classList.contains('collapsed');
              siteMenu.classList.toggle('collapsed');
              document.body.classList.toggle('collapsed');
              localStorage.setItem(collapsedKey, String(nowCollapsed));
            }
          });
        }
      }
      window.__SITE_TREE_UPDATE__ = (tree) => { currentTree = tree; refreshSidebar(); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSidebar);
      else initSidebar();
    })();
    </script>
  ` : '';

  const controlsScript = `
    <script>
    (function() {
      const root = document.documentElement;
      function applyMode(mode) {
        root.dataset.mode = mode;
        localStorage.setItem('md-live-server-theme', mode);
        document.querySelectorAll('[data-mode-toggle]').forEach((btn) => {
          btn.dataset.mode = mode;
          const label = btn.querySelector('.mode-label');
          if (label) label.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode';
          const icon = btn.querySelector('.mode-icon');
          if (icon) icon.textContent = mode === 'dark' ? '☀' : '☾';
        });
        if (window.__MDLS_SET_CM_MODE__) window.__MDLS_SET_CM_MODE__(mode === 'dark');
        if (window.renderMermaid) window.renderMermaid();
      }
      document.querySelectorAll('[data-mode-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => applyMode(root.dataset.mode === 'dark' ? 'light' : 'dark'));
      });
      applyMode(root.dataset.mode === 'dark' ? 'dark' : 'light');

      const contentSel = document.getElementById('content-theme-select');
      if (contentSel) {
        contentSel.value = localStorage.getItem('md-live-server-content-theme') || window.__MDLS__.contentDefault;
        root.dataset.theme = contentSel.value;
        contentSel.addEventListener('change', () => {
          root.dataset.theme = contentSel.value;
          localStorage.setItem('md-live-server-content-theme', contentSel.value);
          if (window.renderMermaid) window.renderMermaid();
        });
      }
      const codeSel = document.getElementById('code-theme-select');
      if (codeSel) {
        codeSel.value = localStorage.getItem('md-live-server-code-theme') || window.__MDLS__.codeDefault;
        codeSel.addEventListener('change', () => {
          localStorage.setItem('md-live-server-code-theme', codeSel.value);
          const link = document.getElementById('hljs-theme');
          const t = window.__MDLS__.codeThemes.find((x) => x.id === codeSel.value);
          if (link && t) link.href = t.href;
          if (window.highlightCode) window.highlightCode();
        });
      }
      const printBtn = document.getElementById('print-btn');
      if (printBtn) printBtn.addEventListener('click', () => window.print());

      const pathText = document.getElementById('header-path-text');
      if (pathText) {
        const p = decodeURIComponent(location.pathname).replace(/^\\//, '');
        pathText.textContent = p || '/';
      }
    })();
    </script>
  `;

  const editorScript = editable ? `
    <script>
    (function() {
      const editBtn = document.getElementById('edit-btn');
      if (!editBtn) return;
      const editor = document.getElementById('md-editor');
      const contentEl = document.getElementById('content');
      const input = document.getElementById('editor-input');
      const preview = document.getElementById('editor-preview');
      const statusEl = document.getElementById('editor-status');
      const saveBtn = document.getElementById('editor-save');
      const cancelBtn = document.getElementById('editor-cancel');
      let cmView = null, fallbackArea = null, md = null, modeCompartment = null, oneDarkExt = null;
      let loaded = false, debounceTimer;

      function getValue() { return cmView ? cmView.state.doc.toString() : (fallbackArea ? fallbackArea.value : ''); }
      function setValue(text) {
        if (cmView) cmView.dispatch({ changes: { from: 0, to: cmView.state.doc.length, insert: text } });
        else if (fallbackArea) fallbackArea.value = text;
      }
      function renderPreview() {
        if (md) preview.innerHTML = md.render(getValue());
        else preview.textContent = 'Live preview unavailable — Save to render.';
        if (window.renderMermaid) window.renderMermaid();
        if (window.highlightCode) window.highlightCode();
      }
      function scheduleRender() { clearTimeout(debounceTimer); debounceTimer = setTimeout(renderPreview, 200); }

      async function ensureEditor() {
        if (loaded) return;
        loaded = true;
        try {
          const mdMod = await import('https://esm.sh/markdown-it@14');
          const MarkdownIt = mdMod.default || mdMod;
          md = new MarkdownIt({ html: true, linkify: true, typographer: true });
        } catch (e) { md = null; }
        try {
          const cm = await import('https://esm.sh/codemirror@6');
          const langMd = await import('https://esm.sh/@codemirror/lang-markdown@6');
          const st = await import('https://esm.sh/@codemirror/state@6');
          const dark = await import('https://esm.sh/@codemirror/theme-one-dark@6');
          oneDarkExt = dark.oneDark;
          modeCompartment = new st.Compartment();
          const startDark = document.documentElement.dataset.mode === 'dark';
          cmView = new cm.EditorView({
            parent: input,
            state: cm.EditorState.create({
              doc: '',
              extensions: [
                cm.basicSetup,
                langMd.markdown(),
                cm.EditorView.lineWrapping,
                modeCompartment.of(startDark ? oneDarkExt : []),
                cm.EditorView.updateListener.of((u) => { if (u.docChanged) scheduleRender(); }),
              ],
            }),
          });
          window.__MDLS_SET_CM_MODE__ = (isDark) => {
            if (cmView && modeCompartment) cmView.dispatch({ effects: modeCompartment.reconfigure(isDark ? oneDarkExt : []) });
          };
        } catch (e) {
          fallbackArea = document.createElement('textarea');
          fallbackArea.className = 'editor-fallback';
          fallbackArea.addEventListener('input', scheduleRender);
          input.appendChild(fallbackArea);
        }
      }

      async function openEditor() {
        await ensureEditor();
        statusEl.textContent = 'Loading…';
        try {
          const res = await fetch('/__mdls__/source?path=' + encodeURIComponent(location.pathname));
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          setValue(data.content || '');
        } catch (e) { statusEl.textContent = 'Could not load source: ' + e.message; return; }
        statusEl.textContent = '';
        window.__MDLS_EDITING__ = true;
        contentEl.hidden = true;
        editor.hidden = false;
        renderPreview();
        if (cmView) cmView.focus(); else if (fallbackArea) fallbackArea.focus();
      }
      function closeEditor() {
        window.__MDLS_EDITING__ = false;
        editor.hidden = true;
        contentEl.hidden = false;
      }
      async function save() {
        statusEl.textContent = 'Saving…';
        saveBtn.disabled = true;
        try {
          const res = await fetch('/__mdls__/save', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: location.pathname, content: getValue() }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || ('HTTP ' + res.status));
          }
          contentEl.innerHTML = preview.innerHTML;
          statusEl.textContent = 'Saved';
          closeEditor();
        } catch (e) { statusEl.textContent = 'Save failed: ' + e.message; }
        finally { saveBtn.disabled = false; }
      }
      editBtn.addEventListener('click', openEditor);
      cancelBtn.addEventListener('click', closeEditor);
      saveBtn.addEventListener('click', save);
    })();
    </script>
  ` : '';

  const wsScript = `
    <script>
    const socket = new WebSocket('ws://127.0.0.1:${port}');
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', path: location.pathname }));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (window.__MDLS_EDITING__) return;
      if (message.type === 'reload') { location.reload(); return; }
      ${hasSidebar ? `if (message.type === 'treeUpdate') {
        if (window.__SITE_TREE_UPDATE__) window.__SITE_TREE_UPDATE__(message.tree);
        return;
      }` : ''}
      const contentDiv = document.getElementById('content');
      contentDiv.innerHTML = message.content;
      contentDiv.querySelectorAll('script').forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
      window.renderMermaid?.();
      window.highlightCode?.();
    });
    </script>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <script>window.__MDLS__ = ${mdlsData};</script>
  <link rel="stylesheet" href="${escapeAttribute(codeThemeHref(DEFAULT_CODE_THEME))}" id="hljs-theme">
  <script>
    (function() {
      const root = document.documentElement;
      root.dataset.theme = localStorage.getItem('md-live-server-content-theme') || window.__MDLS__.contentDefault;
      const saved = localStorage.getItem('md-live-server-theme');
      root.dataset.mode = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const code = localStorage.getItem('md-live-server-code-theme') || window.__MDLS__.codeDefault;
      const link = document.getElementById('hljs-theme');
      const t = window.__MDLS__.codeThemes.find((x) => x.id === code);
      if (link && t) link.href = t.href;
    })();
  </script>
  <script type="module">
    let mermaid;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
      mermaid = mod.default || mod;
    } catch (e) { console.warn('Mermaid failed to load from CDN', e); }

    let hljs;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/highlight.js@11/es/highlight.min.js');
      hljs = mod.default || mod;
    } catch (e) { console.warn('Highlight.js failed to load from CDN', e); }

    window.hljs = hljs;

    window.renderMermaid = async () => {
      if (!mermaid) {
        document.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
          const msg = document.createElement('div');
          msg.style.color = 'var(--muted)';
          msg.style.padding = '1rem';
          msg.style.border = '1px solid var(--border)';
          msg.style.borderRadius = '6px';
          msg.textContent = '[Mermaid unavailable: CDN load failed]';
          code.parentElement.replaceWith(msg);
        });
        return;
      }
      mermaid.initialize({ startOnLoad: false, theme: document.documentElement.dataset.mode === 'dark' ? 'dark' : 'default' });
      const codes = document.querySelectorAll('pre > code.language-mermaid');
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        const container = document.createElement('div');
        container.className = 'mermaid';
        code.parentElement.replaceWith(container);
        try {
          const id = 'mermaid-' + Date.now() + '-' + i;
          const result = await mermaid.render(id, code.textContent || '');
          container.innerHTML = result.svg;
        } catch (err) {
          const pre = document.createElement('pre');
          pre.style.color = 'var(--muted)';
          pre.style.border = '1px solid var(--border)';
          pre.style.padding = '1rem';
          pre.style.borderRadius = '6px';
          pre.textContent = 'Mermaid error: ' + (err?.message || err);
          container.replaceWith(pre);
        }
      }
    };

    window.highlightCode = () => {
      if (!hljs) return;
      document.querySelectorAll('pre code').forEach((block) => {
        if (block.classList.contains('language-mermaid')) return;
        hljs.highlightElement(block);
      });
    };

    window.renderMermaid();
    window.highlightCode();
  </script>
  <style>${pageStyles}</style>
</head>
<body class="${hasSidebar ? 'has-sidebar' : ''}">
  ${sidebarHtml}
  ${headerHtml}
  <main id="content">${content}</main>
  ${editorHtml}
  ${sidebarScript}
  ${controlsScript}
  ${editorScript}
  ${wsScript}
</body>
</html>`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- template`
Expected: PASS — the three new cases plus the original three (`includes sidebar when siteTree is provided`, the two negative cases). The negative cases still hold because `id="site-menu"` and `__SITE_TREE_UPDATE__` are only emitted when `hasSidebar`.

- [ ] **Step 6: Typecheck + full test run**

Run: `npm run compile`
Expected: no TypeScript errors; `out/extension.js` produced.

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/template.ts test/template.test.ts
git commit -m "feat: redesigned chrome, theme system, and in-browser editor"
```

---

## Task 4: Manual verification in the Extension Development Host

**Files:** none (manual QA).

- [ ] **Step 1: Build**

Run: `npm run compile`
Expected: clean build.

- [ ] **Step 2: Launch the Extension Development Host**

Press **F5** in VS Code. In the dev host, open a folder containing several `.md` files (and at least one with a ```mermaid block and a fenced code block), then run **"Start Markdown Live Server"** on a `.md` file.

- [ ] **Step 3: Verify the chrome**

Confirm in the opened browser tab:
- Sidebar shows the logo + "Md Live Server", an icon-based file tree with chevrons, and the active file highlighted.
- Header bar shows ☰, the relative file path, Print, Edit (pencil), and a light/dark toggle.
- Sidebar footer has Theme and Code Theme dropdowns plus a Light/Dark button.

- [ ] **Step 4: Verify themes**

- Switch the Theme dropdown through all palettes (Modern, Aurora, Forest, Midnight, Ghibli) — colors change and persist after reload.
- Switch the Code Theme dropdown — the fenced code block restyles.
- Toggle light/dark from both the header and the sidebar — Mermaid re-renders to match; selection persists.

- [ ] **Step 5: Verify Print**

Click Print → the OS print dialog shows only the document (no sidebar/header/editor).

- [ ] **Step 6: Verify in-browser editing**

- Click Edit → the split editor opens with the file's raw Markdown in CodeMirror (syntax-colored, line numbers) and a live preview pane that updates as you type.
- Click **Save** → status shows "Saved", the editor closes, the preview is reflected in the main view, and the change is written to the file on disk (verify in VS Code).
- Re-open Edit, change text, click **Cancel** → changes discarded, file unchanged.

- [ ] **Step 7: Verify the loopback guard**

From another device on the LAN (or `curl` from a non-loopback interface), open the LAN URL shown in the status bar:
- The page loads and the Edit button is **absent** (non-loopback `hostname`).
- `curl -X POST http://<LAN-IP>:<port>/__mdls__/save -H 'content-type: application/json' -d '{"path":"/a.md","content":"hacked"}'` → returns `403` and does **not** modify the file.

- [ ] **Step 8: Verify directory listings**

Navigate to a directory URL (e.g. a subfolder) → the new chrome + theme selectors render, but **no Edit button** appears.

- [ ] **Step 9: Commit any fixes**

If steps 3–8 surface issues, fix them (re-running `npm test` after each), then:

```bash
git add -A
git commit -m "fix: address manual QA findings for preview UI redesign"
```

---

## Notes for the implementer

- **CDN fallbacks:** if `esm.sh` is unreachable, the editor falls back to a styled `<textarea>` and the live preview shows a "Save to render" message — both paths still write to disk. This mirrors how Mermaid degrades today.
- **Theme attribute migration:** `data-theme` now means the *palette*; light/dark lives on `data-mode`. The `md-live-server-theme` localStorage key is reused for the mode value, so existing users keep their light/dark choice.
- **Why client `markdown-it` for the live preview:** the authoritative render still happens server-side on Save (and broadcasts to other clients). The client renderer is only for the as-you-type preview; minor divergence is acceptable per the spec.
