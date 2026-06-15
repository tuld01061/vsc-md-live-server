import { describe, it, expect } from 'vitest';
import { renderMarkdownPage, renderHtmlPage } from '../src/template';
import type { TreeNode } from '../src/tree';

describe('renderMarkdownPage', () => {
  it('includes sidebar when siteTree is provided', () => {
    const tree: TreeNode[] = [{ name: 'readme.md', path: '/readme.md', type: 'file' }];
    const html = renderMarkdownPage('# Hello', 'Test', tree);
    expect(html).toContain('id="site-menu"');
    expect(html).toContain('__SITE_TREE_UPDATE__');
    expect(html).toContain('/readme.md');
    expect(html).toContain('treeUpdate');
  });

  it('does not include sidebar when siteTree is undefined', () => {
    const html = renderMarkdownPage('# Hello', 'Test');
    expect(html).not.toContain('id="site-menu"');
    expect(html).not.toContain('__SITE_TREE_UPDATE__');
  });

  it('does not include sidebar when siteTree is empty array', () => {
    const html = renderMarkdownPage('# Hello', 'Test', []);
    expect(html).not.toContain('id="site-menu"');
    expect(html).not.toContain('__SITE_TREE_UPDATE__');
  });

  it('renders the header bar, branding, and theme selectors with a sidebar', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', tree, true);
    expect(html).toContain('id="app-header"');
    expect(html).toContain('Md Live Server');
    expect(html).toContain('id="content-theme-select"');
    expect(html).toContain('id="code-theme-select"');
    expect(html).toContain('data-mode-toggle');
    expect(html).toContain('id="print-btn"');
  });

  it('includes editor assets when editable', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', tree, true);
    expect(html).toContain('id="md-editor"');
    expect(html).toContain('id="edit-btn"');
    expect(html).toContain('__mdls__/save');
  });

  it('omits editor assets when not editable', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', tree, false);
    expect(html).not.toContain('id="md-editor"');
    expect(html).not.toContain('id="edit-btn"');
  });

  it('connects the live-reload socket to the serving host, not hardcoded localhost', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', tree, true);
    expect(html).not.toContain('ws://127.0.0.1');
    expect(html).toContain('location.host');
  });

  it('renders distinct folder and file icons in the sidebar tree', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', tree, true);
    expect(html).toContain('FOLDER_ICON');
    expect(html).toContain('folder-icon');
  });

  it('uses the Md Live Server logo artwork in the sidebar brand', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', tree, true);
    expect(html).toContain('M82 88V40h14v36h20v12H82z');
  });
});

describe('renderHtmlPage', () => {
  it('includes sidebar script when tree is provided', () => {
    const tree: TreeNode[] = [{ name: 'readme.md', path: '/readme.md', type: 'file' }];
    const html = renderHtmlPage('<html><body><h1>Test</h1></body></html>', tree);
    expect(html).toContain('__SITE_TREE_UPDATE__');
    expect(html).toContain('id="site-menu"');
  });

  it('does not include sidebar when tree is undefined', () => {
    const html = renderHtmlPage('<html><body><h1>Test</h1></body></html>');
    expect(html).not.toContain('id="site-menu"');
  });

  it('connects the live-reload socket to the serving host, not hardcoded localhost', () => {
    const html = renderHtmlPage('<html><body><h1>Test</h1></body></html>');
    expect(html).not.toContain('ws://127.0.0.1');
    expect(html).toContain('location.host');
  });
});
