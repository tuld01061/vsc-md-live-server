export interface ThemeVars {
  bg: string;
  fg: string;
  muted: string;
  border: string;
  codeBg: string;
  link: string;
  sidebarBg: string;
  headerBg: string;
  accent: string;
}

export interface ContentTheme {
  id: string;
  label: string;
  light: ThemeVars;
  dark: ThemeVars;
}

export interface CodeTheme {
  id: string;
  label: string;
  href: string;
}

export const DEFAULT_CONTENT_THEME = 'modern';
export const DEFAULT_CODE_THEME = 'github-dark';

export const CONTENT_THEMES: ContentTheme[] = [
  {
    id: 'modern',
    label: 'Modern',
    light: { bg: '#ffffff', fg: '#24292f', muted: '#57606a', border: '#d0d7de', codeBg: '#f6f8fa', link: '#0969da', sidebarBg: '#f6f8fa', headerBg: '#ffffff', accent: '#0969da' },
    dark: { bg: '#0d1117', fg: '#c9d1d9', muted: '#8b949e', border: '#30363d', codeBg: '#161b22', link: '#58a6ff', sidebarBg: '#0d1117', headerBg: '#161b22', accent: '#1f6feb' },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    light: { bg: '#ffffff', fg: '#1e1b3a', muted: '#6b6792', border: '#e0ddf0', codeBg: '#f4f2fb', link: '#6d28d9', sidebarBg: '#f7f5fd', headerBg: '#ffffff', accent: '#7c3aed' },
    dark: { bg: '#0f0a23', fg: '#e6e1ff', muted: '#9d97c7', border: '#2a2350', codeBg: '#181238', link: '#b794f6', sidebarBg: '#140d2e', headerBg: '#1a1340', accent: '#9f7aea' },
  },
  {
    id: 'forest',
    label: 'Forest',
    light: { bg: '#fbfdfb', fg: '#1b3a2b', muted: '#5a7a68', border: '#d4e4d8', codeBg: '#eef5ef', link: '#15803d', sidebarBg: '#f1f7f2', headerBg: '#ffffff', accent: '#16a34a' },
    dark: { bg: '#0c1a12', fg: '#cfe9d8', muted: '#7fa890', border: '#1f3a2a', codeBg: '#11241a', link: '#4ade80', sidebarBg: '#0f2016', headerBg: '#14291c', accent: '#22c55e' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    light: { bg: '#ffffff', fg: '#1a2238', muted: '#5b6480', border: '#d6dcec', codeBg: '#f2f4fb', link: '#2563eb', sidebarBg: '#f4f6fc', headerBg: '#ffffff', accent: '#3b82f6' },
    dark: { bg: '#060a18', fg: '#c7d2ed', muted: '#7b86a8', border: '#1c2540', codeBg: '#0d1428', link: '#60a5fa', sidebarBg: '#0a1024', headerBg: '#0f1730', accent: '#3b82f6' },
  },
  {
    id: 'ghibli',
    label: 'Ghibli',
    light: { bg: '#fdfcf7', fg: '#4a3f2f', muted: '#8a7a5e', border: '#e8e0cf', codeBg: '#f5f0e3', link: '#b45309', sidebarBg: '#f7f2e7', headerBg: '#fffdf7', accent: '#d97706' },
    dark: { bg: '#1f1b14', fg: '#ece3d0', muted: '#a89a7c', border: '#3a3424', codeBg: '#2a2418', link: '#fbbf24', sidebarBg: '#241f16', headerBg: '#2c2619', accent: '#f59e0b' },
  },
];

const HLJS_BASE = 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/';

export const CODE_THEMES: CodeTheme[] = [
  { id: 'github-dark', label: 'GitHub Dark', href: `${HLJS_BASE}github-dark.min.css` },
  { id: 'github', label: 'GitHub', href: `${HLJS_BASE}github.min.css` },
  { id: 'atom-one-dark', label: 'Atom One Dark', href: `${HLJS_BASE}atom-one-dark.min.css` },
  { id: 'atom-one-light', label: 'Atom One Light', href: `${HLJS_BASE}atom-one-light.min.css` },
  { id: 'dracula', label: 'Dracula', href: `${HLJS_BASE}base16/dracula.min.css` },
  { id: 'nord', label: 'Nord', href: `${HLJS_BASE}nord.min.css` },
  { id: 'monokai', label: 'Monokai', href: `${HLJS_BASE}monokai.min.css` },
  { id: 'vs2015', label: 'VS 2015', href: `${HLJS_BASE}vs2015.min.css` },
  { id: 'vs', label: 'VS', href: `${HLJS_BASE}vs.min.css` },
  { id: 'tokyo-night-dark', label: 'Tokyo Night Dark', href: `${HLJS_BASE}tokyo-night-dark.min.css` },
  { id: 'tokyo-night-light', label: 'Tokyo Night Light', href: `${HLJS_BASE}tokyo-night-light.min.css` },
  { id: 'a11y-dark', label: 'A11y Dark', href: `${HLJS_BASE}a11y-dark.min.css` },
  { id: 'a11y-light', label: 'A11y Light', href: `${HLJS_BASE}a11y-light.min.css` },
];

function varsToCss(v: ThemeVars): string {
  return [
    `--bg:${v.bg}`,
    `--fg:${v.fg}`,
    `--muted:${v.muted}`,
    `--border:${v.border}`,
    `--code-bg:${v.codeBg}`,
    `--link:${v.link}`,
    `--sidebar-bg:${v.sidebarBg}`,
    `--header-bg:${v.headerBg}`,
    `--accent:${v.accent}`,
  ].join(';');
}

export function buildThemeCss(): string {
  const def = CONTENT_THEMES.find((t) => t.id === DEFAULT_CONTENT_THEME) ?? CONTENT_THEMES[0];
  const blocks: string[] = [`:root{color-scheme:light dark;${varsToCss(def.light)}}`];
  for (const theme of CONTENT_THEMES) {
    blocks.push(`:root[data-theme="${theme.id}"][data-mode="light"]{${varsToCss(theme.light)}}`);
    blocks.push(`:root[data-theme="${theme.id}"][data-mode="dark"]{${varsToCss(theme.dark)}}`);
  }
  return blocks.join('\n');
}

export function codeThemeHref(id: string): string {
  const found =
    CODE_THEMES.find((t) => t.id === id) ??
    CODE_THEMES.find((t) => t.id === DEFAULT_CODE_THEME) ??
    CODE_THEMES[0];
  return found.href;
}
