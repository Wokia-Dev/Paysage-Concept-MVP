/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DARK_THEME_COLOR,
  DEFAULT_THEME_PREFERENCE,
  LIGHT_THEME_COLOR,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  isValidThemePreference,
  readStoredThemePreference,
  resolveTheme,
  writeStoredThemePreference,
} from '../lib/theme.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function channelLum(val: number): number {
  const s = val / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);
  const l1 = 0.2126 * channelLum(c1.r) + 0.7152 * channelLum(c1.g) + 0.0722 * channelLum(c1.b);
  const l2 = 0.2126 * channelLum(c2.r) + 0.7152 * channelLum(c2.g) + 0.0722 * channelLum(c2.b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('Theme System — Resolution, Persistence, Anti-FOUC & Contrast', () => {
  describe('resolveTheme()', () => {
    it('follows system preference when mode is "system"', () => {
      assert.equal(resolveTheme('system', true), 'dark');
      assert.equal(resolveTheme('system', false), 'light');
    });

    it('forces "light" regardless of system preference', () => {
      assert.equal(resolveTheme('light', true), 'light');
      assert.equal(resolveTheme('light', false), 'light');
    });

    it('forces "dark" regardless of system preference', () => {
      assert.equal(resolveTheme('dark', true), 'dark');
      assert.equal(resolveTheme('dark', false), 'dark');
    });
  });

  describe('isValidThemePreference()', () => {
    it('accepts only system, light, dark', () => {
      assert.equal(isValidThemePreference('system'), true);
      assert.equal(isValidThemePreference('light'), true);
      assert.equal(isValidThemePreference('dark'), true);
      assert.equal(isValidThemePreference('auto'), false);
      assert.equal(isValidThemePreference(null), false);
      assert.equal(isValidThemePreference(undefined), false);
      assert.equal(isValidThemePreference(42), false);
    });
  });

  describe('localStorage persistence', () => {
    it('defaults to "system" when storage is empty, null, or contains invalid data', () => {
      const store = new Map<string, string>();
      const reader = { getItem: (k: string) => store.get(k) ?? null };

      assert.equal(readStoredThemePreference(null), DEFAULT_THEME_PREFERENCE);
      assert.equal(readStoredThemePreference(reader), 'system');

      store.set(THEME_STORAGE_KEY, 'invalid-value');
      assert.equal(readStoredThemePreference(reader), 'system');
    });

    it('reads and writes valid preferences using THEME_STORAGE_KEY', () => {
      const store = new Map<string, string>();
      const storage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
      };

      writeStoredThemePreference('dark', storage);
      assert.equal(store.get(THEME_STORAGE_KEY), 'dark');
      assert.equal(readStoredThemePreference(storage), 'dark');

      writeStoredThemePreference('light', storage);
      assert.equal(readStoredThemePreference(storage), 'light');

      writeStoredThemePreference('system', storage);
      assert.equal(readStoredThemePreference(storage), 'system');
    });

    it('handles storage exceptions gracefully without throwing', () => {
      const failingStorage = {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      };

      assert.equal(readStoredThemePreference(failingStorage), 'system');
      assert.doesNotThrow(() => writeStoredThemePreference('dark', failingStorage));
    });
  });

  describe('applyThemeToDocument()', () => {
    it('syncs html classes, colorScheme, backgroundColor, and theme-color meta tag', () => {
      const classes = new Set<string>();
      const metaAttrs = new Map<string, string>([['content', LIGHT_THEME_COLOR]]);
      const rootStyle = { colorScheme: '', backgroundColor: '' };

      const mockDoc = {
        documentElement: {
          classList: {
            toggle: (token: string, force?: boolean) => {
              const shouldAdd = force === undefined ? !classes.has(token) : force;
              if (shouldAdd) {
                classes.add(token);
              } else {
                classes.delete(token);
              }
              return shouldAdd;
            },
          },
          style: rootStyle,
        },
        querySelector: (selector: string) => {
          if (selector === 'meta[name="theme-color"]') {
            return {
              setAttribute: (name: string, val: string) => {
                metaAttrs.set(name, val);
              },
            };
          }
          return null;
        },
      } as unknown as Document;

      applyThemeToDocument('dark', mockDoc);
      assert.equal(classes.has('dark'), true);
      assert.equal(classes.has('light'), false);
      assert.equal(rootStyle.colorScheme, 'dark');
      assert.equal(rootStyle.backgroundColor, DARK_THEME_COLOR);
      assert.equal(metaAttrs.get('content'), DARK_THEME_COLOR);

      applyThemeToDocument('light', mockDoc);
      assert.equal(classes.has('dark'), false);
      assert.equal(classes.has('light'), true);
      assert.equal(rootStyle.colorScheme, 'light');
      assert.equal(rootStyle.backgroundColor, LIGHT_THEME_COLOR);
      assert.equal(metaAttrs.get('content'), LIGHT_THEME_COLOR);
    });
  });

  describe('Static Configuration, Anti-FOUC & Dark Palette WCAG AA Contrast', () => {
    it('verifies synchronous anti-FOUC inline script in index.html before main.tsx', () => {
      const indexHtml = readFileSync(resolve(projectRoot, 'index.html'), 'utf-8');
      const scriptIdx = indexHtml.indexOf("localStorage.getItem(key)");
      const mainIdx = indexHtml.indexOf('/src/main.tsx');

      assert.ok(scriptIdx !== -1, 'index.html must include inline theme initialization script');
      assert.ok(mainIdx !== -1, 'index.html must include main.tsx entry');
      assert.ok(scriptIdx < mainIdx, 'Anti-FOUC script must execute before main.tsx loads');
      assert.match(indexHtml, /paysage_theme_preference/);
      assert.match(indexHtml, /prefers-color-scheme:\s*dark/);
    });

    it('verifies Tailwind v4 class dark variant and html.dark rules in src/index.css', () => {
      const indexCss = readFileSync(resolve(projectRoot, 'src/index.css'), 'utf-8');
      assert.match(
        indexCss,
        /@custom-variant\s+dark\s+\(&:where\(\.dark,\s*\.dark\s*\*\)\);/,
        'src/index.css must configure Tailwind v4 class-based dark variant'
      );
      assert.match(indexCss, /html\.dark\s*\{[\s\S]*?color-scheme:\s*dark;/);
      assert.match(indexCss, /html\.dark\s+body\s*\{[\s\S]*?background-color:\s*#0F1716;/i);
    });

    it('verifies App.tsx wraps app in ThemeProvider and Plus.tsx exposes ThemeSelector', () => {
      const appContent = readFileSync(resolve(projectRoot, 'src/App.tsx'), 'utf-8');
      const plusContent = readFileSync(resolve(projectRoot, 'src/pages/Plus.tsx'), 'utf-8');

      assert.match(appContent, /<ThemeProvider>/);
      assert.match(plusContent, /<ThemeSelector\s*\/>/);
    });

    it('verifies dark mode palette meets WCAG AA (>= 4.5:1) contrast on cards and canvas', () => {
      const darkCanvas = '#0F1716';
      const darkCard = '#172322';
      const darkTile = '#1E2E2C';
      const darkPrimaryText = '#EDF2F0';
      const darkSecondaryText = '#B8C7C2';
      const darkSage = '#9BB89B';
      const darkTerracotta = '#E38D69';
      const darkCtaBg = '#235852';
      const white = '#FFFFFF';

      assert.ok(getContrastRatio(darkPrimaryText, darkCanvas) >= 7.0);
      assert.ok(getContrastRatio(darkPrimaryText, darkCard) >= 7.0);
      assert.ok(getContrastRatio(darkPrimaryText, darkTile) >= 7.0);
      assert.ok(getContrastRatio(darkSecondaryText, darkCard) >= 4.5);
      assert.ok(getContrastRatio(darkSage, darkCard) >= 4.5);
      assert.ok(getContrastRatio(darkTerracotta, darkCard) >= 4.5);
      assert.ok(getContrastRatio(white, darkCtaBg) >= 7.0);
    });
  });
});
