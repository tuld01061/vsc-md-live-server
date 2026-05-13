import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import express from 'express';
import MarkdownIt from 'markdown-it';
import { WebSocketServer, WebSocket } from 'ws';
import { renderDirectoryPage, renderHtmlPage, renderMarkdownPage } from './template';

export interface MarkdownLiveServerOptions {
  port?: number;
  rootPath: string;
  entryPath: string;
}

interface ReloadMessage {
  type: 'reload';
}

interface MarkdownMessage {
  type: 'markdown';
  content: string;
}

export class MarkdownLiveServer {
  private readonly markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });
  private readonly port: number;
  private readonly rootPath: string;
  private readonly entryPath: string;
  private readonly sockets = new Set<net.Socket>();
  private httpServer?: http.Server;
  private webSocketServer?: WebSocketServer;

  constructor(options: MarkdownLiveServerOptions) {
    this.port = options.port ?? 0;
    this.rootPath = options.rootPath;
    this.entryPath = options.entryPath;
  }

  async start(): Promise<number> {
    if (this.httpServer) {
      return this.currentPort();
    }

    const app = express();

    app.get('*', (request, response, next) => {
      const filePath = this.resolveRequestPath(request.path);
      if (!filePath) {
        response.status(404).send('Not found');
        return;
      }

      if (fs.statSync(filePath).isDirectory()) {
        response.send(renderDirectoryPage(request.path, fs.readdirSync(filePath, { withFileTypes: true })));
        return;
      }

      if (path.extname(filePath).toLowerCase() === '.md') {
        response.send(renderMarkdownPage(this.renderMarkdownFile(filePath), path.basename(filePath), this.currentPort()));
        return;
      }

      if (path.extname(filePath).toLowerCase() === '.html') {
        response.send(renderHtmlPage(fs.readFileSync(filePath, 'utf8'), this.currentPort()));
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

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.once('error', reject);
      this.httpServer?.listen(this.port, '127.0.0.1', () => resolve());
    });

    return this.currentPort();
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

  broadcastChange(filePath: string): void {
    const message: ReloadMessage | MarkdownMessage = path.extname(filePath).toLowerCase() === '.md'
      ? { type: 'markdown', content: this.renderMarkdownFile(filePath) }
      : { type: 'reload' };

    const payload = JSON.stringify(message);
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

  entryUrl(): string {
    return `http://127.0.0.1:${this.currentPort()}${this.toRequestPath(this.entryPath)}`;
  }

  private resolveRequestPath(requestPath: string): string | undefined {
    const decodedPath = decodeURIComponent(requestPath);
    const filePath = path.normalize(path.join(this.rootPath, decodedPath));
    if (!filePath.startsWith(this.rootPath)) {
      return undefined;
    }
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    return filePath;
  }

  private renderMarkdownFile(filePath: string): string {
    return this.markdown.render(fs.readFileSync(filePath, 'utf8'));
  }

  private toRequestPath(filePath: string): string {
    const relativePath = path.relative(this.rootPath, filePath).split(path.sep).map(encodeURIComponent).join('/');
    return `/${relativePath}`;
  }
}
