import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanDirectory, matchesPattern } from '../src/tree';

describe('scanDirectory', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-live-tree-'));
    fs.mkdirSync(path.join(tmpDir, 'docs'));
    fs.writeFileSync(path.join(tmpDir, 'docs', 'guide.md'), '# Guide');
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Readme');
    fs.mkdirSync(path.join(tmpDir, '.hidden'));
    fs.writeFileSync(path.join(tmpDir, '.hidden', 'secret.md'), '# Secret');
    fs.mkdirSync(path.join(tmpDir, 'node_modules'));
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg.json'), '{}');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns tree of md and html files and directories', () => {
    const tree = scanDirectory(tmpDir, '/', { include: ['*'], exclude: ['.*', 'node_modules'] });
    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({ name: 'docs', type: 'directory' });
    expect(tree[1]).toMatchObject({ name: 'readme.md', type: 'file' });
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children?.[0]).toMatchObject({ name: 'guide.md', type: 'file', path: '/docs/guide.md' });
  });

  it('excludes non-md and non-html files', () => {
    fs.writeFileSync(path.join(tmpDir, 'script.js'), 'x');
    fs.writeFileSync(path.join(tmpDir, 'style.css'), 'x');
    try {
      const tree = scanDirectory(tmpDir, '/', { include: ['*'], exclude: ['.*', 'node_modules'] });
      expect(tree.find(n => n.name === 'script.js')).toBeUndefined();
      expect(tree.find(n => n.name === 'style.css')).toBeUndefined();
      expect(tree.find(n => n.name === 'readme.md')).toBeDefined();
    } finally {
      fs.unlinkSync(path.join(tmpDir, 'script.js'));
      fs.unlinkSync(path.join(tmpDir, 'style.css'));
    }
  });

  it('excludes hidden files and node_modules by default', () => {
    const tree = scanDirectory(tmpDir, '/', { include: ['*'], exclude: ['.*', 'node_modules'] });
    expect(tree.find(n => n.name === '.hidden')).toBeUndefined();
    expect(tree.find(n => n.name === 'node_modules')).toBeUndefined();
  });

  it('sorts directories before files alphabetically', () => {
    const filePath = path.join(tmpDir, 'aaa.md');
    fs.writeFileSync(filePath, '# A');
    try {
      const tree = scanDirectory(tmpDir, '/', { include: ['*'], exclude: ['.*', 'node_modules'] });
      expect(tree[0].type).toBe('directory');
      expect(tree[1].name).toBe('aaa.md');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it('returns empty array for empty directory', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-live-empty-'));
    try {
      const tree = scanDirectory(emptyDir, '/', { include: ['*'], exclude: ['.*', 'node_modules'] });
      expect(tree).toEqual([]);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('handles symlinks gracefully', () => {
    const linkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-live-link-'));
    fs.mkdirSync(path.join(linkDir, 'docs'));
    fs.writeFileSync(path.join(linkDir, 'docs', 'guide.md'), '# Guide');
    // Create a symlink pointing back to parent (would loop)
    fs.symlinkSync(linkDir, path.join(linkDir, 'loop'));
    try {
      const tree = scanDirectory(linkDir, '/', { include: ['*'], exclude: ['.*', 'node_modules'] });
      expect(tree.find(n => n.name === 'loop')).toBeUndefined();
    } finally {
      fs.rmSync(linkDir, { recursive: true, force: true });
    }
  });
});

describe('matchesPattern', () => {
  it('matches exact names', () => {
    expect(matchesPattern('readme.md', 'readme.md')).toBe(true);
    expect(matchesPattern('readme.md', 'other.md')).toBe(false);
  });

  it('matches wildcard star', () => {
    expect(matchesPattern('anything', '*')).toBe(true);
  });

  it('matches hidden pattern', () => {
    expect(matchesPattern('.git', '.*')).toBe(true);
    expect(matchesPattern('.hidden', '.*')).toBe(true);
    expect(matchesPattern('normal', '.*')).toBe(false);
  });
});
