import { describe, it, expect } from 'vitest';
import { renderMarkdownPage, renderHtmlPage } from '../src/template';
import type { TreeNode } from '../src/tree';

describe('renderMarkdownPage', () => {
  it('includes sidebar when siteTree is provided', () => {
    const tree: TreeNode[] = [{ name: 'readme.md', path: '/readme.md', type: 'file' }];
    const html = renderMarkdownPage('# Hello', 'Test', 3000, tree);
    expect(html).toContain('id="site-menu"');
    expect(html).toContain('__SITE_TREE_UPDATE__');
    expect(html).toContain('/readme.md');
    expect(html).toContain('treeUpdate');
  });

  it('does not include sidebar when siteTree is undefined', () => {
    const html = renderMarkdownPage('# Hello', 'Test', 3000);
    expect(html).not.toContain('id="site-menu"');
    expect(html).not.toContain('__SITE_TREE_UPDATE__');
  });

  it('does not include sidebar when siteTree is empty array', () => {
    const html = renderMarkdownPage('# Hello', 'Test', 3000, []);
    expect(html).not.toContain('id="site-menu"');
    expect(html).not.toContain('__SITE_TREE_UPDATE__');
  });

  it('renders the header bar, branding, and theme selectors with a sidebar', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', 3000, tree, true);
    expect(html).toContain('id="app-header"');
    expect(html).toContain('Md Live Server');
    expect(html).toContain('id="content-theme-select"');
    expect(html).toContain('id="code-theme-select"');
    expect(html).toContain('data-mode-toggle');
    expect(html).toContain('id="print-btn"');
  });

  it('includes editor assets when editable', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', 3000, tree, true);
    expect(html).toContain('id="md-editor"');
    expect(html).toContain('id="edit-btn"');
    expect(html).toContain('__mdls__/save');
  });

  it('omits editor assets when not editable', () => {
    const tree: TreeNode[] = [{ name: 'a.md', path: '/a.md', type: 'file' }];
    const html = renderMarkdownPage('# Hi', 'a.md', 3000, tree, false);
    expect(html).not.toContain('id="md-editor"');
    expect(html).not.toContain('id="edit-btn"');
  });
});

describe('renderHtmlPage', () => {
  it('includes sidebar script when tree is provided', () => {
    const tree: TreeNode[] = [{ name: 'readme.md', path: '/readme.md', type: 'file' }];
    const html = renderHtmlPage('<html><body><h1>Test</h1></body></html>', 3000, tree);
    expect(html).toContain('__SITE_TREE_UPDATE__');
    expect(html).toContain('id="site-menu"');
  });

  it('does not include sidebar when tree is undefined', () => {
    const html = renderHtmlPage('<html><body><h1>Test</h1></body></html>', 3000);
    expect(html).not.toContain('id="site-menu"');
  });
});
