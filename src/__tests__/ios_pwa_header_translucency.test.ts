/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('iOS Standalone PWA Status Bar & Safe Area Integration', () => {
  const indexHtmlPath = resolve(projectRoot, 'index.html');
  const indexCssPath = resolve(projectRoot, 'src/index.css');
  const viteConfigPath = resolve(projectRoot, 'vite.config.ts');
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');
  const appLayoutPath = resolve(projectRoot, 'src/components/layout/AppLayout.tsx');

  const indexHtml = readFileSync(indexHtmlPath, 'utf-8');
  const indexCss = readFileSync(indexCssPath, 'utf-8');
  const viteConfig = readFileSync(viteConfigPath, 'utf-8');
  const homeContent = readFileSync(homePath, 'utf-8');
  const appLayoutContent = readFileSync(appLayoutPath, 'utf-8');

  describe('Dimension 1: HTML Document Metadata & Standalone PWA Architecture', () => {
    it('verifies apple-mobile-web-app-status-bar-style is declared as black-translucent for edge-to-edge rendering', () => {
      assert.match(
        indexHtml,
        /<meta\s+name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"\s*\/?>/,
        'apple-mobile-web-app-status-bar-style must be black-translucent to render header content behind status bar'
      );
    });

    it('verifies apple-mobile-web-app-capable and mobile-web-app-capable are enabled', () => {
      assert.match(indexHtml, /<meta\s+name="apple-mobile-web-app-capable"\s+content="yes"\s*\/?>/);
      assert.match(indexHtml, /<meta\s+name="mobile-web-app-capable"\s+content="yes"\s*\/?>/);
    });

    it('verifies viewport-fit=cover is explicitly enabled in viewport meta tag', () => {
      assert.match(indexHtml, /viewport-fit=cover/);
    });

    it('verifies theme-color meta tag strictly matches Forest Green (#15302F)', () => {
      assert.match(indexHtml, /<meta\s+name="theme-color"\s+content="#15302F"\s*\/?>/);
    });

    it('verifies root html element declares synchronous Forest Green background to prevent WebKit light status bar sampling', () => {
      assert.match(
        indexHtml,
        /<html[^>]*style="[^"]*background-color:\s*#15302F;?[^"]*"/,
        'html element in index.html must specify synchronous background-color #15302F'
      );
    });

    it('verifies color-scheme meta tag is declared as light dark to prevent WebKit light mode enforcement', () => {
      assert.match(
        indexHtml,
        /<meta\s+name="color-scheme"\s+content="light dark"\s*\/?>/,
        'index.html must declare color-scheme meta tag with light dark support'
      );
    });
  });

  describe('Dimension 2: Manifest & Global CSS Canvas Backgrounds', () => {
    it('verifies manifest background_color in vite.config.ts matches Forest Green to avoid white splash/compositor sampling', () => {
      assert.match(
        viteConfig,
        /background_color:\s*['"]#15302F['"]/,
        'Manifest background_color must be #15302F'
      );
    });

    it('verifies manifest theme_color in vite.config.ts matches Forest Green (#15302F)', () => {
      assert.match(
        viteConfig,
        /theme_color:\s*['"]#15302F['"]/,
        'Manifest theme_color must be #15302F'
      );
    });

    it('verifies index.css configures html element background-color to var(--color-foret) and declares color-scheme', () => {
      assert.match(
        indexCss,
        /html\s*\{[\s\S]*?background-color:\s*var\(--color-foret\);?[\s\S]*?\}/,
        'html rule in src/index.css must set background-color: var(--color-foret)'
      );
      assert.match(
        indexCss,
        /html\s*\{[\s\S]*?color-scheme:\s*light dark;?[\s\S]*?\}/,
        'html rule in src/index.css must set color-scheme: light dark'
      );
    });

    it('verifies body element preserves canvas craie background and antialiasing', () => {
      assert.match(
        indexCss,
        /body\s*\{[\s\S]*?background-color:\s*var\(--color-craie\);?[\s\S]*?\}/,
        'body rule in src/index.css must maintain canvas craie background'
      );
      assert.match(indexCss, /overscroll-behavior-y:\s*none/);
      assert.match(indexCss, /-webkit-font-smoothing:\s*antialiased/);
    });
  });

  describe('Dimension 3: Safe Area Viewport Clearance & Header Continuity', () => {
    it('verifies Home biophilic hero header dynamically accounts for safe-area-inset-top with 1.75rem baseline', () => {
      assert.match(
        homeContent,
        /pt-\[calc\(env\(safe-area-inset-top,\s*0px\)\s*\+\s*1\.75rem\)\]/,
        'Home header must dynamically add env(safe-area-inset-top, 0px) to clear iPhone hardware notch/Dynamic Island'
      );
    });

    it('verifies Home biophilic hero header maintains full background coverage and border curve', () => {
      assert.match(homeContent, /bg-foret/);
      assert.match(homeContent, /rounded-b-3xl/);
      assert.match(homeContent, /-mx-4\s+-mt-4/);
    });

    it('verifies Home hero vertical gradient mask covers safe-area status bar with solid Forest Green to prevent white sky bleed', () => {
      assert.match(
        homeContent,
        /linear-gradient\(180deg,\s*#15302F\s+0%/,
        'Home hero vertical gradient mask must anchor at #15302F 0% to prevent bright sky from causing a status bar blur'
      );
    });

    it('verifies Home hero ambient halo is positioned away from the top status bar notch corner', () => {
      assert.match(
        homeContent,
        /radial-gradient\(circle\s+300px\s+at\s+100%\s+35%/,
        'Sage ambient halo must be positioned away from 100% 0% to avoid illuminating the top-right status bar area'
      );
    });

    it('verifies AppLayout secondary header preserves sticky top-0 and pt-safe', () => {
      assert.match(
        appLayoutContent,
        /sticky\s+top-0/,
        'AppLayout secondary header must dock sticky at top-0'
      );
      assert.match(
        appLayoutContent,
        /pt-safe/,
        'AppLayout secondary header must use pt-safe inset'
      );
      assert.match(
        appLayoutContent,
        /bg-foret\s+text-blanc/,
        'AppLayout secondary header must use Vert Foret theme'
      );
    });

    it('verifies AppLayout main scroll container contains overscroll to prevent rubber-band background bleed', () => {
      assert.match(
        appLayoutContent,
        /overscroll-y-contain/,
        'AppLayout main must contain vertical overscroll'
      );
    });

    it('verifies safe-area CSS utility variables handle 0px fallback for desktop and Android', () => {
      assert.match(indexCss, /env\(safe-area-inset-top,\s*0px\)/);
      assert.match(indexCss, /env\(safe-area-inset-bottom,\s*0px\)/);
    });
  });
});
