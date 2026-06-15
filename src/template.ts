import * as fs from 'fs';
import * as path from 'path';
import type { TreeNode } from './tree';
import {
  CONTENT_THEMES,
  CODE_THEMES,
  buildThemeCss,
  codeThemeHref,
  DEFAULT_CONTENT_THEME,
  DEFAULT_CODE_THEME,
} from './themes';

export function renderMarkdownPage(
  content: string,
  title: string,
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
      function applyMode(mode, persist) {
        root.dataset.mode = mode;
        if (persist) localStorage.setItem('md-live-server-theme', mode);
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
        btn.addEventListener('click', () => applyMode(root.dataset.mode === 'dark' ? 'light' : 'dark', true));
      });
      applyMode(root.dataset.mode === 'dark' ? 'dark' : 'light', false);

      const contentSel = document.getElementById('content-theme-select');
      if (contentSel) {
        contentSel.value = localStorage.getItem('md-live-server-content-theme') || window.__MDLS__.contentDefault;
        root.dataset.theme = contentSel.value;
        contentSel.addEventListener('change', () => {
          root.dataset.theme = contentSel.value;
          localStorage.setItem('md-live-server-content-theme', contentSel.value);
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
      if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)) { editBtn.remove(); return; }
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
        if (window.renderMermaid) window.renderMermaid(preview);
        if (window.highlightCode) window.highlightCode(preview);
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
          if (md) contentEl.innerHTML = preview.innerHTML; else location.reload();
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
    const socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
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

    let mermaidSeq = 0;
    window.renderMermaid = async (root) => {
      root = root || document;
      if (!mermaid) {
        root.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
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
      const codes = root.querySelectorAll('pre > code.language-mermaid');
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        const container = document.createElement('div');
        container.className = 'mermaid';
        code.parentElement.replaceWith(container);
        try {
          const id = 'mermaid-' + (mermaidSeq++);
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

    window.highlightCode = (root) => {
      if (!hljs) return;
      (root || document).querySelectorAll('pre code').forEach((block) => {
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

export function renderHtmlPage(content: string, siteTree?: TreeNode[]): string {
  const hasSidebar = siteTree !== undefined && siteTree.length > 0;

  const sidebarHtml = hasSidebar ? `
    <aside id="site-menu" style="position: fixed; top: 0; left: 0; width: 260px; height: 100vh; border-right: 1px solid #d0d7de; overflow-y: auto; padding: 1rem; background: #fff; z-index: 100; box-sizing: border-box;">
      <div style="margin-top: 2.5rem;">
        <input type="text" id="site-menu-search" placeholder="Search files..." style="width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #d0d7de; border-radius: 4px; margin-bottom: 0.5rem; box-sizing: border-box; font-size: 0.875rem;">
      </div>
      <div id="site-menu-tree" style="font-size: 0.875rem;"></div>
    </aside>
    <button id="site-menu-toggle" aria-label="Toggle menu" style="position: fixed; top: 1rem; left: 1rem; z-index: 101; background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 4px; padding: 0.4rem 0.6rem; cursor: pointer;">☰</button>
  ` : '';

  const sidebarScript = hasSidebar ? `
    <style>
      #site-menu { position: fixed; top: 0; left: 0; width: 260px; height: 100vh; border-right: 1px solid #d0d7de; overflow-y: auto; padding: 1rem; background: #fff; z-index: 100; box-sizing: border-box; transition: transform 0.2s; }
      #site-menu.collapsed { transform: translateX(-260px); }
      #site-menu-search { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #d0d7de; border-radius: 4px; margin-bottom: 0.5rem; box-sizing: border-box; font-size: 0.875rem; }
      #site-menu-tree { font-size: 0.875rem; }
      #site-menu-tree ul { list-style: none; padding: 0; margin: 0; }
      #site-menu-tree ul ul { padding-left: 0.75rem; }
      #site-menu-tree li { margin: 0.15rem 0; }
      #site-menu-tree a { text-decoration: none; display: block; padding: 0.15rem 0; color: #24292f; }
      #site-menu-tree a:hover { color: #0969da; }
      #site-menu-tree a.active { font-weight: bold; color: #0969da; }
      body.has-sidebar { padding-left: 260px; }
      body.has-sidebar.collapsed { padding-left: 0; }
      @media (max-width: 768px) { body.has-sidebar { padding-left: 0 !important; } #site-menu { transform: translateX(-100%); } #site-menu.open { transform: translateX(0); } #site-menu.collapsed { transform: translateX(-100%); } #site-menu-toggle { display: block !important; } }
    </style>
    <script>
    (function() {
      let currentTree = ${JSON.stringify(siteTree).replace(/</g, '\\u003c')};
      function loadExpandedState() {
        try { return new Set(JSON.parse(localStorage.getItem('md-live-server-tree-state') || '[]')); }
        catch { return new Set(); }
      }
      function saveExpandedState(expanded) {
        localStorage.setItem('md-live-server-tree-state', JSON.stringify([...expanded]));
      }
      function shouldShowNode(node, query) {
        if (!query) return true;
        if (node.name.toLowerCase().includes(query)) return true;
        if (node.type === 'directory' && node.children) {
          return node.children.some(child => shouldShowNode(child, query));
        }
        return false;
      }
      function renderTree(nodes, expanded, container, depth, query) {
        if (!nodes || nodes.length === 0) return;
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.paddingLeft = depth === 0 ? '0' : '0.75rem';
        ul.style.margin = '0';
        for (const node of nodes) {
          if (!shouldShowNode(node, query)) continue;
          const li = document.createElement('li');
          li.style.margin = '0.15rem 0';
          if (node.type === 'directory') {
            const isExpanded = expanded.has(node.path) || !!query;
            const toggle = document.createElement('span');
            toggle.textContent = isExpanded ? '▼ ' : '▶ ';
            toggle.style.cursor = 'pointer';
            toggle.style.userSelect = 'none';
            toggle.style.color = '#57606a';
            toggle.style.fontSize = '0.75rem';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = node.name;
            nameSpan.style.cursor = 'pointer';
            const folderDiv = document.createElement('div');
            folderDiv.appendChild(toggle);
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
            toggle.addEventListener('click', toggleHandler);
            nameSpan.addEventListener('click', toggleHandler);
          } else {
            const link = document.createElement('a');
            link.href = node.path;
            link.textContent = node.name;
            link.style.textDecoration = 'none';
            link.style.display = 'block';
            if (node.path === location.pathname) link.style.fontWeight = 'bold';
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
        document.body.classList.add('has-sidebar');
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
    <script>
    const socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', path: location.pathname }));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'reload') { location.reload(); }
      if (message.type === 'treeUpdate') {
        if (window.__SITE_TREE_UPDATE__) window.__SITE_TREE_UPDATE__(message.tree);
      }
    });
    </script>
  ` : `
    <script>
    const socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'reload') { location.reload(); }
    });
    </script>
  `;

  if (hasSidebar) {
    if (/<\/body>/i.test(content)) {
      return content.replace(/<\/body>/i, sidebarHtml + '\n' + sidebarScript + '\n</body>');
    }
    return content + '\n' + sidebarHtml + '\n' + sidebarScript;
  }

  const script = `<script>
  const socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'reload') {
      location.reload();
    }
  });
</script>`;

  if (/<\/body>/i.test(content)) {
    return content.replace(/<\/body>/i, script + '\n</body>');
  }
  return content + '\n' + script;
}

export function renderDirectoryPage(requestPath: string, entries: fs.Dirent[]): string {
  const parentPath = path.posix.dirname(requestPath === '/' ? '' : requestPath);
  const links = [requestPath !== '/' ? `<li><a href="${escapeAttribute(parentPath || '/')}">..</a></li>` : '']
    .concat(entries.map((entry) => {
      const name = `${entry.name}${entry.isDirectory() ? '/' : ''}`;
      const href = path.posix.join(requestPath, encodeURIComponent(entry.name)) + (entry.isDirectory() ? '/' : '');
      return `<li><a href="${escapeAttribute(href)}">${escapeHtml(name)}</a></li>`;
    }))
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Index of ${escapeHtml(requestPath)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 2rem; }
    li { margin: 0.35rem 0; }
  </style>
</head>
<body>
  <h1>Index of ${escapeHtml(requestPath)}</h1>
  <ul>${links}</ul>
</body>
</html>`;
}

export function renderDirectoryMarkdownPage(requestPath: string, entries: fs.Dirent[], siteTree?: TreeNode[]): string {
  const parentPath = path.posix.dirname(requestPath === '/' ? '' : requestPath);
  const links = [requestPath !== '/' ? `<li><a href="${escapeAttribute(parentPath || '/')}">..</a></li>` : '']
    .concat(entries.map((entry) => {
      const name = `${entry.name}${entry.isDirectory() ? '/' : ''}`;
      const href = path.posix.join(requestPath, encodeURIComponent(entry.name)) + (entry.isDirectory() ? '/' : '');
      return `<li><a href="${escapeAttribute(href)}">${escapeHtml(name)}</a></li>`;
    }))
    .join('');

  const content = `<h1>${escapeHtml(`Index of ${requestPath}`)}</h1><ul>${links}</ul>`;
  return renderMarkdownPage(content, `Index of ${requestPath}`, siteTree);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
