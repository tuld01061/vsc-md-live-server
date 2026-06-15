import { describe, it, expect } from 'vitest';
import {
  CONTENT_THEMES,
  CODE_THEMES,
  buildThemeCss,
  codeThemeHref,
  DEFAULT_CONTENT_THEME,
  DEFAULT_CODE_THEME,
} from '../src/themes';

describe('CODE_THEMES', () => {
  it('every entry has id, label, and a jsdelivr highlight.js href', () => {
    expect(CODE_THEMES.length).toBeGreaterThan(0);
    for (const t of CODE_THEMES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.href).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/highlight\.js@11\/styles\/.+\.css$/);
    }
  });

  it('contains the default code theme', () => {
    expect(CODE_THEMES.some((t) => t.id === DEFAULT_CODE_THEME)).toBe(true);
  });
});

describe('CONTENT_THEMES', () => {
  const keys = ['bg', 'fg', 'muted', 'border', 'codeBg', 'link', 'sidebarBg', 'headerBg', 'accent'] as const;

  it('every palette defines all vars for light and dark', () => {
    expect(CONTENT_THEMES.length).toBeGreaterThan(0);
    for (const theme of CONTENT_THEMES) {
      for (const mode of ['light', 'dark'] as const) {
        for (const k of keys) {
          expect(theme[mode][k], `${theme.id}.${mode}.${k}`).toBeTruthy();
        }
      }
    }
  });

  it('contains the default content theme', () => {
    expect(CONTENT_THEMES.some((t) => t.id === DEFAULT_CONTENT_THEME)).toBe(true);
  });
});

describe('buildThemeCss', () => {
  it('emits a selector per theme per mode', () => {
    const css = buildThemeCss();
    for (const theme of CONTENT_THEMES) {
      expect(css).toContain(`[data-theme="${theme.id}"][data-mode="light"]`);
      expect(css).toContain(`[data-theme="${theme.id}"][data-mode="dark"]`);
    }
  });
});

describe('codeThemeHref', () => {
  it('returns the href for a known id', () => {
    const gh = CODE_THEMES.find((t) => t.id === 'github')!;
    expect(codeThemeHref('github')).toBe(gh.href);
  });

  it('falls back to the default for an unknown id', () => {
    expect(codeThemeHref('does-not-exist')).toBe(codeThemeHref(DEFAULT_CODE_THEME));
  });
});
