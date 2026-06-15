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
    id: 'aurora',
    label: 'Aurora',
    light: { bg: '#faf7ff', fg: '#2a2350', muted: '#6b6792', border: '#e4ddf5', codeBg: '#f1ebfc', link: '#7c3aed', sidebarBg: '#f3eefe', headerBg: '#f6f1ff', accent: '#7c3aed' },
    dark: { bg: '#0f0a23', fg: '#e6e1ff', muted: '#9d97c7', border: '#2a2350', codeBg: '#181238', link: '#b794f6', sidebarBg: '#140d2e', headerBg: '#1a1340', accent: '#9f7aea' },
  },
  {
    id: 'forest',
    label: 'Forest',
    light: { bg: '#f5fbf6', fg: '#14361f', muted: '#5a7a68', border: '#d6e9da', codeBg: '#e8f4ea', link: '#15803d', sidebarBg: '#e9f5ec', headerBg: '#eef8f0', accent: '#16a34a' },
    dark: { bg: '#0c1a12', fg: '#cfe9d8', muted: '#7fa890', border: '#1f3a2a', codeBg: '#11241a', link: '#4ade80', sidebarBg: '#0f2016', headerBg: '#14291c', accent: '#22c55e' },
  },
  {
    id: 'ghibli',
    label: 'Ghibli',
    light: { bg: '#fdfaf1', fg: '#4a3f2f', muted: '#8a7a5e', border: '#ebe1cd', codeBg: '#f4ecdb', link: '#b45309', sidebarBg: '#f6efe0', headerBg: '#faf4e6', accent: '#ca8a04' },
    dark: { bg: '#1f1b14', fg: '#ece3d0', muted: '#a89a7c', border: '#3a3424', codeBg: '#2a2418', link: '#fbbf24', sidebarBg: '#241f16', headerBg: '#2c2619', accent: '#f59e0b' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    light: { bg: '#f4f7fd', fg: '#1a2238', muted: '#5b6480', border: '#dce4f3', codeBg: '#e9eff9', link: '#2563eb', sidebarBg: '#e8eefb', headerBg: '#eef3fc', accent: '#3b82f6' },
    dark: { bg: '#060a18', fg: '#c7d2ed', muted: '#7b86a8', border: '#1c2540', codeBg: '#0d1428', link: '#60a5fa', sidebarBg: '#0a1024', headerBg: '#0f1730', accent: '#3b82f6' },
  },
  {
    id: 'modern',
    label: 'Modern',
    light: { bg: '#ffffff', fg: '#24292f', muted: '#57606a', border: '#d0d7de', codeBg: '#f6f8fa', link: '#0969da', sidebarBg: '#f6f8fa', headerBg: '#ffffff', accent: '#0969da' },
    dark: { bg: '#0d1117', fg: '#c9d1d9', muted: '#8b949e', border: '#30363d', codeBg: '#161b22', link: '#58a6ff', sidebarBg: '#0d1117', headerBg: '#161b22', accent: '#1f6feb' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    light: { bg: '#f1fafd', fg: '#0b3a4a', muted: '#4a7889', border: '#cfe6ee', codeBg: '#e2f2f7', link: '#0e7490', sidebarBg: '#e2f3f9', headerBg: '#e9f6fb', accent: '#0891b2' },
    dark: { bg: '#07191f', fg: '#cfeef5', muted: '#79a9b5', border: '#16363f', codeBg: '#0c2229', link: '#38bdf8', sidebarBg: '#0a2028', headerBg: '#0e2932', accent: '#06b6d4' },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    light: { bg: '#fff8f3', fg: '#4a2a23', muted: '#8a685c', border: '#f3ddd1', codeBg: '#fcebde', link: '#c2410c', sidebarBg: '#fdeee3', headerBg: '#fff2e9', accent: '#ea580c' },
    dark: { bg: '#1f1310', fg: '#f0d9cd', muted: '#b08a7c', border: '#3a241c', codeBg: '#2a1812', link: '#fb923c', sidebarBg: '#241612', headerBg: '#2c1b15', accent: '#f97316' },
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
