import * as fs from 'fs';
import * as path from 'path';

export function renderMarkdownPage(content: string, title: string, port: number): string {
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
        const id = 'mermaid-' + Date.now() + '-' + i;
        container.id = id;
        code.parentElement.replaceWith(container);
        try {
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
    body {
      box-sizing: border-box;
      max-width: 980px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      color: var(--fg);
      background: var(--bg);
    }
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
  </style>
</head>
<body>
  <div class="toolbar"><button id="theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme">☾</button></div>
  <main id="content">${content}</main>
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
  </script>
</body>
</html>`;
}

export function renderHtmlPage(content: string, port: number): string {
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
