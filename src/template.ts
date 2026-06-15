import * as fs from 'fs';
import * as path from 'path';
import type { TreeNode } from './tree';

export function renderMarkdownPage(content: string, title: string, port: number, siteTree?: TreeNode[], editable: boolean = false): string {
  const hasSidebar = siteTree !== undefined && siteTree.length > 0;

  const sidebarStyles = hasSidebar ? `
    #site-menu { position: fixed; top: 0; left: 0; width: 260px; height: 100vh; border-right: 1px solid var(--border); overflow-y: auto; padding: 1rem; background: var(--bg); z-index: 100; box-sizing: border-box; transition: transform 0.2s; }
    #site-menu.collapsed { transform: translateX(-260px); }
    #site-menu-search { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--fg); margin-bottom: 0.5rem; box-sizing: border-box; font-size: 0.875rem; }
    #site-menu-tree { font-size: 0.875rem; }
    #site-menu-tree ul { list-style: none; padding: 0; margin: 0; }
    #site-menu-tree ul ul { padding-left: 0.75rem; }
    #site-menu-tree li { margin: 0.15rem 0; }
    #site-menu-tree a { text-decoration: none; display: block; padding: 0.15rem 0; color: var(--fg); }
    #site-menu-tree a:hover { color: var(--link); }
    #site-menu-tree a.active { font-weight: bold; color: var(--link); }
    .menu-toggle { position: fixed; top: 1rem; left: 1rem; z-index: 101; background: var(--code-bg); border: 1px solid var(--border); border-radius: 4px; padding: 0.4rem 0.6rem; cursor: pointer; color: var(--fg); font-size: 1rem; }
    @media (max-width: 768px) { body.has-sidebar { padding-left: 0 !important; } #site-menu { transform: translateX(-100%); } #site-menu.open { transform: translateX(0); } #site-menu.collapsed { transform: translateX(-100%); } #content { margin-left: 0; padding: 1rem; } }
  ` : '';

  const bodyRule = hasSidebar
    ? 'body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: var(--fg); background: var(--bg); }\n    body.has-sidebar { padding-left: 260px; }\n    body.has-sidebar.collapsed { padding-left: 0; }'
    : 'body { box-sizing: border-box; max-width: 980px; margin: 0 auto; padding: 2rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: var(--fg); background: var(--bg); }';

  const contentRule = hasSidebar
    ? '#content { margin: 0 auto; padding: 2rem; max-width: 980px; }'
    : '';

  const sidebarHtml = hasSidebar ? `
    <aside id="site-menu">
      <div style="margin-top: 2.5rem;">
        <input type="text" id="site-menu-search" placeholder="Search files..." autocomplete="off">
      </div>
      <div id="site-menu-tree"></div>
    </aside>
    <button class="menu-toggle" id="site-menu-toggle" aria-label="Toggle menu">☰</button>
  ` : '';

  const sidebarScript = hasSidebar ? `
    <script>
    (function() {
      const TREE_STATE_KEY = 'md-live-server-tree-state';
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
            toggle.style.color = 'var(--muted)';
            toggle.style.fontSize = '0.75rem';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = node.name;
            nameSpan.style.cursor = 'pointer';

            const folderDiv = document.createElement('div');
            folderDiv.appendChild(toggle);
            folderDiv.appendChild(nameSpan);
            li.appendChild(folderDiv);

            if (node.children && isExpanded) {
              renderTree(node.children, expanded, li, depth + 1, query);
            }

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
                if (child.type === 'directory' && findAndExpand([child])) {
                  expanded.add(node.path); return true;
                }
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

  const wsScript = hasSidebar ? `
    const socket = new WebSocket('ws://127.0.0.1:${port}');
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', path: location.pathname }));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'reload') {
        location.reload();
        return;
      }
      if (message.type === 'treeUpdate') {
        if (window.__SITE_TREE_UPDATE__) window.__SITE_TREE_UPDATE__(message.tree);
        return;
      }
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
  ` : `
    const socket = new WebSocket('ws://127.0.0.1:${port}');
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', path: location.pathname }));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'reload') {
        location.reload();
        return;
      }
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
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css" id="hljs-theme">
  <script type="module">
    let mermaid;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
      mermaid = mod.default || mod;
    } catch (e) {
      console.warn('Mermaid failed to load from CDN', e);
    }

    let hljs;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/highlight.js@11/es/highlight.min.js');
      hljs = mod.default || mod;
    } catch (e) {
      console.warn('Highlight.js failed to load from CDN', e);
    }

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
      mermaid.initialize({ startOnLoad: false, theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default' });
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
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --fg: #24292f;
      --muted: #57606a;
      --border: #d0d7de;
      --code-bg: #f6f8fa;
      --link: #0969da;
    }
    :root[data-theme="dark"] {
      --bg: #0d1117;
      --fg: #c9d1d9;
      --muted: #8b949e;
      --border: #30363d;
      --code-bg: #161b22;
      --link: #58a6ff;
    }
    ${bodyRule}
    a { color: var(--link); }
    pre {
      overflow: auto;
      padding: 1rem;
      background: var(--code-bg);
      border-radius: 6px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    }
    blockquote {
      margin-left: 0;
      padding-left: 1rem;
      color: var(--muted);
      border-left: 4px solid var(--border);
    }
    img { max-width: 100%; }
    table { border-collapse: collapse; }
    th, td {
      padding: 0.4rem 0.7rem;
      border: 1px solid var(--border);
    }
    .toolbar {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 50;
    }
    .toolbar button {
      display: inline-grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--fg);
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0;
      cursor: pointer;
      font-size: 1rem;
    }
    ${contentRule}
    ${sidebarStyles}
  </style>
</head>
<body class="has-sidebar">
  <div class="toolbar"><button id="theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme">☾</button></div>
  ${sidebarHtml}
  <main id="content">${content}</main>
  ${sidebarScript}
  <script>
    const savedTheme = localStorage.getItem('md-live-server-theme');
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = savedTheme || preferredTheme;

    const themeToggle = document.getElementById('theme-toggle');
    const updateThemeIcon = () => {
      themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾';
    };
    updateThemeIcon();
    themeToggle.addEventListener('click', () => {
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('md-live-server-theme', document.documentElement.dataset.theme);
      updateThemeIcon();
      const hljsTheme = document.getElementById('hljs-theme');
      if (hljsTheme) {
        hljsTheme.href = document.documentElement.dataset.theme === 'dark'
          ? 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css'
          : 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css';
      }
      location.reload();
    });

    ${wsScript}
  </script>
</body>
</html>`;
}

export function renderHtmlPage(content: string, port: number, siteTree?: TreeNode[]): string {
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
    const socket = new WebSocket('ws://127.0.0.1:${port}');
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
    const socket = new WebSocket('ws://127.0.0.1:${port}');
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
  const socket = new WebSocket('ws://127.0.0.1:${port}');
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

export function renderDirectoryMarkdownPage(requestPath: string, entries: fs.Dirent[], port: number, siteTree?: TreeNode[]): string {
  const parentPath = path.posix.dirname(requestPath === '/' ? '' : requestPath);
  const links = [requestPath !== '/' ? `<li><a href="${escapeAttribute(parentPath || '/')}">..</a></li>` : '']
    .concat(entries.map((entry) => {
      const name = `${entry.name}${entry.isDirectory() ? '/' : ''}`;
      const href = path.posix.join(requestPath, encodeURIComponent(entry.name)) + (entry.isDirectory() ? '/' : '');
      return `<li><a href="${escapeAttribute(href)}">${escapeHtml(name)}</a></li>`;
    }))
    .join('');

  const content = `<h1>${escapeHtml(`Index of ${requestPath}`)}</h1><ul>${links}</ul>`;
  return renderMarkdownPage(content, `Index of ${requestPath}`, port, siteTree);
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
