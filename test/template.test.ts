import { describe, it, expect } from 'vitest';
import { renderMarkdownPage, renderHtmlPage } from '../src/template';
import type { TreeNode } from '../src/tree';

describe('renderMarkdownPage', () => {
  it('includes sidebar when siteTree is provided', () => {
    const tree: TreeNode[] = [{ name: 'readme.md', path: '/readme.md', type: 'file' }];
    const html = renderMarkdownPage('# Hello', 'Test', 3000, tree);
    expect(html).toContain('id="site-menu"');
    expect(html).toContain('__SITE_TREE__');
    expect(html).toContain('/readme.md');
    expect(html).toContain('treeUpdate');
  });

  it('does not include sidebar when siteTree is undefined', () => {
    const html = renderMarkdownPage('# Hello', 'Test', 3000);
    expect(html).not.toContain('id="site-menu"');
    expect(html).not.toContain('__SITE_TREE__');
  });

  it('does not include sidebar when siteTree is empty', () => {
    const html = renderMarkdownPage('# Hello', 'Test', 3000, []);
    expect(html).toContain('id="site-menu"');
  });
});

describe('renderHtmlPage', () => {
  it('includes sidebar script when tree is provided', () => {
    const tree: TreeNode[] = [{ name: 'readme.md', path: '/readme.md', type: 'file' }];
    const html = renderHtmlPage('<html><body><h1>Test</h1></body></html>', 3000, tree);
    expect(html).toContain('__SITE_TREE__');
    expect(html).toContain('id="site-menu"');
  });

  it('does not include sidebar when tree is undefined', () => {
    const html = renderHtmlPage('<html><body><h1>Test</h1></body></html>', 3000);
    expect(html).not.toContain('id="site-menu"');
  });
});
