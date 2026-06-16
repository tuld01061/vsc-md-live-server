# Syntax Highlighting

Code blocks are syntax‑highlighted with your chosen code theme (GitHub, Dracula, Nord, Tokyo Night, and more).

## TypeScript

```typescript
import * as vscode from 'vscode';
import { MarkdownLiveServer } from './server';

let liveServer: MarkdownLiveServer | undefined;

export function activate(context: vscode.ExtensionContext) {
  const start = vscode.commands.registerCommand(
    'md-live-server.start',
    async () => {
      const port = vscode.workspace.getConfiguration('mdLiveServer').get<number>('port', 4400);
      liveServer = new MarkdownLiveServer(rootPath, port);
      await liveServer.start();
    }
  );
  context.subscriptions.push(start);
}
```

## JavaScript

```javascript
const ws = new WebSocket(`ws://127.0.0.1:${port}`);

ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === 'reload') location.reload();
  if (msg.type === 'update') renderMarkdown(msg.content);
});

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'subscribe', path: location.pathname }));
});
```

## Python

```python
import subprocess
import webbrowser

def start_preview(file_path: str, port: int = 4400) -> None:
    """Open a Markdown file in Markdown Live Server."""
    subprocess.Popen(["code", "--command", "md-live-server.start"])
    webbrowser.open(f"http://localhost:{port}/{file_path}")
```

## Bash

```bash
# Install the extension
code --install-extension tuld01061.md-live-server

# Open a folder and start the server
code my-docs/
# Then: Command Palette → Markdown Live Server: Start
```

## JSON

```json
{
  "mdLiveServer.port": 4400,
  "mdLiveServer.siteMenu.enabled": true,
  "mdLiveServer.siteMenu.exclude": [".*", "node_modules", "dist"]
}
```

## CSS

```css
[data-theme="ocean"] {
  --bg: #0f1923;
  --text: #cdd9e5;
  --accent: #4d9de0;
  --sidebar-bg: #0a1117;
}

[data-theme="ocean"].light {
  --bg: #f0f6fc;
  --text: #1c2128;
  --accent: #0969da;
}
```
