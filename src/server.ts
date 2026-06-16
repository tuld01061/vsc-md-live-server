import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import express from 'express';
import MarkdownIt from 'markdown-it';
import { WebSocketServer, WebSocket } from 'ws';
import { renderDirectoryMarkdownPage, renderHtmlPage, renderMarkdownPage } from './template';
import { scanDirectory, TreeNode, ScanOptions } from './tree';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isLoopback(remoteAddress?: string): boolean {
  return remoteAddress !== undefined && LOOPBACK_ADDRESSES.has(remoteAddress);
}

export interface MarkdownLiveServerOptions {
  port?: number;
  rootPath: string;
  entryPath: string;
  siteMenu?: ScanOptions;
  /** Absolute path to the bundled in-browser editor script (out/editor.js). */
  editorScriptPath?: string;
}

interface ReloadMessage {
  type: 'reload';
}

interface MarkdownMessage {
  type: 'markdown';
  content: string;
}

export class MarkdownLiveServer {
  private static readonly PORT_FALLBACK_ATTEMPTS = 100;
  private readonly markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });
  private readonly port: number;
  private readonly rootPath: string;
  private readonly rootRealPath: string;
  private entryPath: string;
  private readonly sockets = new Set<net.Socket>();
  private readonly clientPaths = new WeakMap<WebSocket, string>();
  private httpServer?: http.Server;
  private webSocketServer?: WebSocketServer;
  private siteTree: TreeNode[] = [];
  private readonly siteMenuOptions?: ScanOptions;
  private readonly editorScriptPath: string;

  constructor(options: MarkdownLiveServerOptions) {
    this.port = options.port ?? 0;
    this.rootPath = options.rootPath;
    this.rootRealPath = fs.realpathSync(options.rootPath);
    this.entryPath = options.entryPath;
    this.siteMenuOptions = options.siteMenu;
    this.editorScriptPath = options.editorScriptPath ?? path.join(__dirname, 'editor.js');
  }

  async start(): Promise<number> {
    if (this.httpServer) {
      return this.currentPort();
    }

    const app = express();

    app.use(express.json({ limit: '5mb' }));

    app.get('/__mdls__/editor.js', (_request, response) => {
      try {
        response.type('application/javascript').send(fs.readFileSync(this.editorScriptPath, 'utf8'));
      } catch {
        response.status(404).send('// editor bundle not available');
      }
    });

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

    app.get('*', (request, response, next) => {
      const filePath = this.resolveRequestPath(request.path);
      if (!filePath) {
        response.status(404).send('Not found');
        return;
      }

      if (fs.statSync(filePath).isDirectory()) {
        response.send(renderDirectoryMarkdownPage(
          request.path,
          fs.readdirSync(filePath, { withFileTypes: true }),
          this.siteMenuOptions ? this.siteTree : undefined
        ));
        return;
      }

      if (path.extname(filePath).toLowerCase() === '.md') {
        response.send(renderMarkdownPage(
          this.renderMarkdownFile(filePath),
          path.basename(filePath),
          this.siteMenuOptions ? this.siteTree : undefined,
          true
        ));
        return;
      }

      if (path.extname(filePath).toLowerCase() === '.html') {
        response.send(renderHtmlPage(
          fs.readFileSync(filePath, 'utf8'),
          this.siteMenuOptions ? this.siteTree : undefined
        ));
        return;
      }

      next();
    });

    app.use(express.static(this.rootPath));

    this.httpServer = http.createServer(app);
    this.httpServer.on('connection', (socket) => {
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
    });
    this.webSocketServer = new WebSocketServer({ server: this.httpServer });
    this.webSocketServer.on('connection', (ws) => {
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(String(data)) as { type: string; path?: string };
          if (msg.type === 'subscribe' && msg.path) {
            this.clientPaths.set(ws, msg.path);
          }
        } catch {
          // ignore malformed messages
        }
      });
    });

    await this.listenWithFallback(this.httpServer, this.port);

    this.rebuildSiteTree();

    return this.currentPort();
  }

  private async listenWithFallback(server: http.Server, startPort: number): Promise<void> {
    const host = '0.0.0.0';
    // A requested port of 0 lets the OS assign any free port; otherwise probe for the
    // first available port starting at the requested one (e.g. 4400 → 4401 → 4402 …).
    const port = startPort === 0
      ? 0
      : await this.findAvailablePort(startPort, host, MarkdownLiveServer.PORT_FALLBACK_ATTEMPTS);

    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.removeListener('error', onError);
        reject(error);
      };
      server.once('error', onError);
      server.listen(port, host, () => {
        server.removeListener('error', onError);
        resolve();
      });
    });
  }

  private findAvailablePort(startPort: number, host: string, maxAttempts: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      let port = startPort;
      let attemptsLeft = maxAttempts;

      const tryPort = () => {
        const probe = net.createServer();
        probe.once('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
            attemptsLeft--;
            port++;
            tryPort();
          } else {
            reject(error);
          }
        });
        probe.listen(port, host, () => {
          const assigned = (probe.address() as net.AddressInfo).port;
          probe.close(() => resolve(assigned));
        });
      };

      tryPort();
    });
  }

  async stop(): Promise<void> {
    this.webSocketServer?.clients.forEach((client) => client.close());
    this.webSocketServer?.close();
    this.webSocketServer = undefined;

    if (!this.httpServer) {
      return;
    }

    const server = this.httpServer;
    this.httpServer = undefined;
    this.sockets.forEach((socket) => socket.destroy());
    this.sockets.clear();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }

  broadcastChange(filePath: string, content?: string): void {
    const isMarkdown = path.extname(filePath).toLowerCase() === '.md';
    const requestPath = this.toRequestPath(filePath);

    const message: ReloadMessage | MarkdownMessage = isMarkdown
      ? { type: 'markdown', content: content !== undefined ? this.renderMarkdown(content) : this.renderMarkdownFile(filePath) }
      : { type: 'reload' };

    const payload = JSON.stringify(message);
    this.webSocketServer?.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }
      const clientPath = this.clientPaths.get(client);
      if (isMarkdown && clientPath && this.decodePath(clientPath) !== this.decodePath(requestPath)) {
        return;
      }
      client.send(payload);
    });
  }

  rebuildSiteTree(): void {
    if (!this.siteMenuOptions) {
      this.siteTree = [];
      return;
    }
    this.siteTree = scanDirectory(this.rootPath, '/', this.siteMenuOptions);
  }

  broadcastTreeUpdate(): void {
    const payload = JSON.stringify({ type: 'treeUpdate', tree: this.siteTree });
    this.webSocketServer?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  currentPort(): number {
    const address = this.httpServer?.address();
    if (!address || typeof address === 'string') {
      return this.port;
    }
    return address.port;
  }

  setEntryPath(entryPath: string): void {
    this.entryPath = entryPath;
  }

  entryUrl(): string {
    return `http://127.0.0.1:${this.currentPort()}${this.toRequestPath(this.entryPath)}`;
  }

  lanUrl(): string | undefined {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] ?? []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return `http://${iface.address}:${this.currentPort()}${this.toRequestPath(this.entryPath)}`;
        }
      }
    }
    return undefined;
  }

  resolveRequestPath(requestPath: string): string | undefined {
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(requestPath);
    } catch {
      return undefined;
    }
    const joinedPath = path.normalize(path.join(this.rootPath, decodedPath));
    const relativePath = path.relative(this.rootPath, joinedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return undefined;
    }
    let resolvedPath: string;
    try {
      resolvedPath = fs.realpathSync(joinedPath);
    } catch {
      return undefined;
    }
    const resolvedRelative = path.relative(this.rootRealPath, resolvedPath);
    if (resolvedRelative.startsWith('..') || path.isAbsolute(resolvedRelative)) {
      return undefined;
    }
    return resolvedPath;
  }

  renderMarkdownFile(filePath: string): string {
    return this.renderMarkdown(fs.readFileSync(filePath, 'utf8'));
  }

  private renderMarkdown(source: string): string {
    return this.addLinkTargets(this.markdown.render(source));
  }

  private addLinkTargets(html: string): string {
    return html.replace(/<a href="(https?:\/\/[^"]*)"/gi, '<a href="$1" target="_blank" rel="noopener noreferrer"');
  }

  // Normalises a request path for comparison. Clients send the browser's
  // percent-encoded location.pathname, while toRequestPath also encodes each
  // segment; decoding both sides makes the comparison robust for non-ASCII names.
  private decodePath(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private toRequestPath(filePath: string): string {
    const relativePath = path.relative(this.rootPath, filePath).split(path.sep).map(encodeURIComponent).join('/');
    return `/${relativePath}`;
  }
}
