import * as fs from 'fs';
import * as path from 'path';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

export interface ScanOptions {
  include: string[];
  exclude: string[];
}

export function scanDirectory(rootPath: string, requestPath: string, options: ScanOptions, visited?: Set<string>): TreeNode[] {
  const resolvedPath = fs.realpathSync(rootPath);
  if (visited?.has(resolvedPath)) {
    return [];
  }
  visited = visited ?? new Set<string>();
  visited.add(resolvedPath);

  const entries: TreeNode[] = [];
  let items: fs.Dirent[];
  try {
    items = fs.readdirSync(rootPath, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const item of items) {
    const included = options.include.some(p => matchesPattern(item.name, p));
    const excluded = options.exclude.some(p => matchesPattern(item.name, p));
    if (!included || excluded) {
      continue;
    }

    const itemRequestPath = requestPath === '/'
      ? `/${encodeURIComponent(item.name)}`
      : `${requestPath}/${encodeURIComponent(item.name)}`;

    if (item.isSymbolicLink()) {
      continue;
    }
    if (!item.isDirectory()) {
      const ext = path.extname(item.name).toLowerCase();
      if (ext !== '.md' && ext !== '.html') {
        continue;
      }
    }
    if (item.isDirectory()) {
      const itemRootPath = path.join(rootPath, item.name);
      const children = scanDirectory(itemRootPath, itemRequestPath, options, visited);
      if (children.length === 0) {
        continue;
      }
      entries.push({ name: item.name, path: itemRequestPath + '/', type: 'directory', children });
    } else {
      entries.push({ name: item.name, path: itemRequestPath, type: 'file' });
    }
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return entries;
}

export function matchesPattern(name: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }
  if (pattern.includes('*')) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
    return regex.test(name);
  }
  return name === pattern;
}
