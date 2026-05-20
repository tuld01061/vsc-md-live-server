import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WebSocket } from 'ws';
import { MarkdownLiveServer } from '../src/server';

describe('resolveRequestPath', () => {
  let tmpDir: string;
  let server: MarkdownLiveServer;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-live-test-'));
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Hello');
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'nested.md'), '# Nested');
    server = new MarkdownLiveServer({ rootPath: tmpDir, entryPath: path.join(tmpDir, 'readme.md'), siteMenu: { enabled: true, include: ['*'], exclude: ['.*'] } });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns resolved path for files inside root', () => {
    const result = server.resolveRequestPath('/readme.md');
    expect(result).toBe(fs.realpathSync(path.join(tmpDir, 'readme.md')));
  });

  it('returns resolved path for nested files', () => {
    const result = server.resolveRequestPath('/sub/nested.md');
    expect(result).toBe(fs.realpathSync(path.join(tmpDir, 'sub', 'nested.md')));
  });

  it('returns undefined for path traversal', () => {
    expect(server.resolveRequestPath('/../secret.txt')).toBeUndefined();
    expect(server.resolveRequestPath('/sub/../../../secret.txt')).toBeUndefined();
  });

  it('returns undefined for prefix sibling attack', () => {
    const siblingDir = `${tmpDir}-secret`;
    fs.mkdirSync(siblingDir);
    fs.writeFileSync(path.join(siblingDir, 'leak.txt'), 'leak');
    try {
      expect(server.resolveRequestPath(`/${path.basename(tmpDir)}-secret/leak.txt`)).toBeUndefined();
    } finally {
      fs.rmSync(siblingDir, { recursive: true, force: true });
    }
  });

  it('returns undefined for malformed URI encoding', () => {
    expect(server.resolveRequestPath('/%ZZ')).toBeUndefined();
    expect(server.resolveRequestPath('/%')).toBeUndefined();
  });

  it('blocks symlink escape outside root', () => {
    const outsideFile = path.join(os.tmpdir(), `md-live-outside-${Date.now()}.txt`);
    fs.writeFileSync(outsideFile, 'outside');
    const linkPath = path.join(tmpDir, 'escape.txt');
    fs.symlinkSync(outsideFile, linkPath);
    try {
      expect(server.resolveRequestPath('/escape.txt')).toBeUndefined();
    } finally {
      fs.unlinkSync(linkPath);
      fs.unlinkSync(outsideFile);
    }
  });

  it('builds site tree on start', () => {
    server['rebuildSiteTree']();
    expect(server['siteTree']).toBeDefined();
    expect(server['siteTree'].length).toBeGreaterThan(0);
    expect(server['siteTree'].some(n => n.name === 'readme.md')).toBe(true);
  });
});

describe('broadcastChange', () => {
  let tmpDir: string;
  let server: MarkdownLiveServer;
  let port: number;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-live-broadcast-'));
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# A');
    fs.writeFileSync(path.join(tmpDir, 'b.md'), '# B');
    server = new MarkdownLiveServer({ rootPath: tmpDir, entryPath: path.join(tmpDir, 'a.md') });
    port = await server.start();
  });

  afterAll(async () => {
    await server.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sends markdown update only to client subscribed to that file', async () => {
    const clientA = new WebSocket(`ws://127.0.0.1:${port}`);
    const clientB = new WebSocket(`ws://127.0.0.1:${port}`);

    await Promise.all([
      new Promise<void>((resolve) => clientA.once('open', resolve)),
      new Promise<void>((resolve) => clientB.once('open', resolve)),
    ]);

    clientA.send(JSON.stringify({ type: 'subscribe', path: '/a.md' }));
    clientB.send(JSON.stringify({ type: 'subscribe', path: '/b.md' }));

    // small delay for message processing
    await new Promise((r) => setTimeout(r, 50));

    const messagesA: unknown[] = [];
    const messagesB: unknown[] = [];
    clientA.on('message', (data) => messagesA.push(JSON.parse(String(data))));
    clientB.on('message', (data) => messagesB.push(JSON.parse(String(data))));

    server.broadcastChange(path.join(tmpDir, 'a.md'));

    await new Promise((r) => setTimeout(r, 50));

    expect(messagesA.length).toBe(1);
    expect(messagesA[0]).toMatchObject({ type: 'markdown' });
    expect(messagesB.length).toBe(0);

    clientA.close();
    clientB.close();
  });

  it('sends reload to all clients regardless of subscription', async () => {
    const clientA = new WebSocket(`ws://127.0.0.1:${port}`);
    const clientB = new WebSocket(`ws://127.0.0.1:${port}`);

    await Promise.all([
      new Promise<void>((resolve) => clientA.once('open', resolve)),
      new Promise<void>((resolve) => clientB.once('open', resolve)),
    ]);

    clientA.send(JSON.stringify({ type: 'subscribe', path: '/a.md' }));
    clientB.send(JSON.stringify({ type: 'subscribe', path: '/b.md' }));

    await new Promise((r) => setTimeout(r, 50));

    const messagesA: unknown[] = [];
    const messagesB: unknown[] = [];
    clientA.on('message', (data) => messagesA.push(JSON.parse(String(data))));
    clientB.on('message', (data) => messagesB.push(JSON.parse(String(data))));

    server.broadcastChange(path.join(tmpDir, 'page.html'));

    await new Promise((r) => setTimeout(r, 50));

    expect(messagesA.length).toBe(1);
    expect(messagesA[0]).toEqual({ type: 'reload' });
    expect(messagesB.length).toBe(1);
    expect(messagesB[0]).toEqual({ type: 'reload' });

    clientA.close();
    clientB.close();
  });
});

describe('broadcastTreeUpdate', () => {
  let tmpDir: string;
  let server: MarkdownLiveServer;
  let port: number;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-live-tree-broadcast-'));
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# A');
    server = new MarkdownLiveServer({
      rootPath: tmpDir,
      entryPath: path.join(tmpDir, 'a.md'),
      siteMenu: { enabled: true, include: ['*'], exclude: ['.*'] }
    });
    port = await server.start();
  });

  afterAll(async () => {
    await server.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('broadcasts treeUpdate to all WebSocket clients', async () => {
    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise<void>((resolve) => client.once('open', resolve));

    const messages: unknown[] = [];
    client.on('message', (data) => messages.push(JSON.parse(String(data))));

    server.broadcastTreeUpdate();

    await new Promise((r) => setTimeout(r, 50));

    expect(messages.length).toBe(1);
    expect(messages[0]).toMatchObject({ type: 'treeUpdate' });
    expect((messages[0] as { tree: unknown[] }).tree.length).toBeGreaterThan(0);

    client.close();
  });
});
