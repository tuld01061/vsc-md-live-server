import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { MarkdownLiveServer } from './server';

type ServerState = 'stopped' | 'starting' | 'started' | 'stopping';

let liveServer: MarkdownLiveServer | undefined;
let liveRootPath: string | undefined;
let livePort: number | undefined;
let serverState: ServerState = 'stopped';
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'md-live-server.toggle';
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('md-live-server.start', startServer),
    vscode.commands.registerCommand('md-live-server.stop', stopServer),
    vscode.commands.registerCommand('md-live-server.toggle', toggleServer),
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (liveRootPath && isInsideRoot(event.document.uri.fsPath, liveRootPath) && event.document.languageId === 'markdown') {
        liveServer?.broadcastChange(event.document.uri.fsPath, event.document.getText());
      }
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (liveRootPath && isInsideRoot(document.uri.fsPath, liveRootPath)) {
        liveServer?.broadcastChange(document.uri.fsPath);
      }
    })
  );

  updateStatusBar();
}

export async function deactivate(): Promise<void> {
  await stopServer();
}

async function toggleServer(): Promise<void> {
  if (serverState === 'starting' || serverState === 'stopping') {
    return;
  }

  if (liveServer) {
    await stopServer();
    return;
  }

  await startServer();
}

async function startServer(resource?: vscode.Uri): Promise<void> {
  if (serverState === 'starting' || serverState === 'stopping') {
    return;
  }

  const entryPath = getEntryPath(resource);
  if (!entryPath) {
    vscode.window.showWarningMessage('Open a file or folder first.');
    return;
  }

  if (liveServer) {
    await stopServer();
  }

  const rootPath = getRootPath(entryPath);
  liveRootPath = rootPath;
  liveServer = new MarkdownLiveServer({ rootPath, entryPath });
  serverState = 'starting';
  updateStatusBar();

  try {
    livePort = await liveServer.start();
    serverState = 'started';
    updateStatusBar();
  } catch (error) {
    await liveServer?.stop();
    liveServer = undefined;
    liveRootPath = undefined;
    livePort = undefined;
    serverState = 'stopped';
    updateStatusBar();
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Markdown Live Server failed: ${message}`);
    return;
  }

  try {
    await vscode.env.openExternal(vscode.Uri.parse(liveServer.entryUrl()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showWarningMessage(`Could not open browser: ${message}`);
  }
}

async function stopServer(): Promise<void> {
  if (serverState === 'starting' || serverState === 'stopping') {
    return;
  }

  if (!liveServer) {
    serverState = 'stopped';
    updateStatusBar();
    return;
  }

  serverState = 'stopping';
  updateStatusBar();
  await liveServer.stop();
  liveServer = undefined;
  liveRootPath = undefined;
  livePort = undefined;
  serverState = 'stopped';
  updateStatusBar();
}

function getEntryPath(resource?: vscode.Uri): string | undefined {
  if (resource?.scheme === 'file') {
    return resource.fsPath;
  }

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument?.uri.scheme === 'file') {
    return activeDocument.uri.fsPath;
  }

  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getRootPath(entryPath: string): string {
  const stat = fs.statSync(entryPath);
  if (stat.isDirectory()) {
    return entryPath;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(entryPath));
  return workspaceFolder?.uri.fsPath ?? path.dirname(entryPath);
}

function isInsideRoot(filePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function updateStatusBar(): void {
  if (serverState === 'starting') {
    statusBarItem.text = '$(sync~spin) Starting MD Live Server';
    statusBarItem.tooltip = 'Markdown Live Server is starting';
    statusBarItem.show();
    return;
  }

  if (serverState === 'stopping') {
    statusBarItem.text = '$(sync~spin) Stopping MD Live Server';
    statusBarItem.tooltip = 'Markdown Live Server is stopping';
    statusBarItem.show();
    return;
  }

  if (liveServer) {
    statusBarItem.text = `$(circle-slash) Port: ${livePort ?? liveServer.currentPort()}`;
    const lanUrl = liveServer.lanUrl();
    statusBarItem.tooltip = lanUrl
      ? `Local: ${liveServer.entryUrl()}\nLAN: ${lanUrl}\nClick to stop`
      : 'Stop Markdown Live Server';
    statusBarItem.show();
    return;
  }

  statusBarItem.text = '$(broadcast) Start MD Live Server';
  statusBarItem.tooltip = 'Start Markdown Live Server';
  statusBarItem.show();
}
