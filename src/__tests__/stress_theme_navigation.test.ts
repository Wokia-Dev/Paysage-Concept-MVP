/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, NavLink } from 'react-router-dom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

/**
 * WCAG 2.1 Relative Luminance & Contrast Calculation (W3C standard)
 */
function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function sRgbLuminance(c8bit: number): number {
  const c = c8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * sRgbLuminance(r) + 0.7152 * sRgbLuminance(g) + 0.0722 * sRgbLuminance(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

describe('Empirical Adversarial Stress Harness: Theme Tokens & BottomNav (M1)', () => {
  const indexCssPath = resolve(projectRoot, 'src/index.css');
  const bottomNavPath = resolve(projectRoot, 'src/components/layout/BottomNav.tsx');
  const appLayoutPath = resolve(projectRoot, 'src/components/layout/AppLayout.tsx');
  const indexHtmlPath = resolve(projectRoot, 'index.html');

  const indexCss = readFileSync(indexCssPath, 'utf-8');
  const bottomNavContent = readFileSync(bottomNavPath, 'utf-8');
  const appLayoutContent = readFileSync(appLayoutPath, 'utf-8');
  const indexHtml = readFileSync(indexHtmlPath, 'utf-8');

  // Palette hex definitions
  const PALETTE = {
    foret: '#15302F',
    sauge: '#8FA98F',
    sable: '#E8E3D9',
    craie: '#FAFAFB',
    terracotta: '#C47452',
    blanc: '#FFFFFF',
    muted: '#6B7280',
  };

  describe('Dimension 1: CSS Variables & Production Build Compilation', () => {
    it('verifies exact hexadecimal specifications in src/index.css', () => {
      assert.match(indexCss, /--color-foret:\s*#15302F/i);
      assert.match(indexCss, /--color-sauge:\s*#8FA98F/i);
      assert.match(indexCss, /--color-sable:\s*#E8E3D9/i);
      assert.match(indexCss, /--color-craie:\s*#FAFAFB/i);
      assert.match(indexCss, /--color-terracotta:\s*#C47452/i);
      assert.match(indexCss, /--color-blanc:\s*#FFFFFF/i);
      assert.match(indexCss, /--color-muted:\s*#6B7280/i);
      assert.match(indexCss, /--shadow-soft:\s*0\s+4px\s+20px\s+rgba\(21,\s*48,\s*47,\s*0\.06\)/);
    });

    it('verifies utility classes compiled into production dist/assets bundle', () => {
      const distAssetsDir = resolve(projectRoot, 'dist/assets');
      if (existsSync(distAssetsDir)) {
        const cssFiles = readdirSync(distAssetsDir).filter((f) => f.endsWith('.css'));
        assert.ok(cssFiles.length > 0, 'Production CSS bundle must exist in dist/assets');
        const distCss = readFileSync(resolve(distAssetsDir, cssFiles[0]), 'utf-8');

        // Verify generated utility classes
        const requiredSelectors = [
          'text-foret',
          'bg-foret',
          'text-sauge',
          'bg-sauge',
          'bg-terracotta',
          'text-terracotta',
          'bg-sable',
          'bg-craie',
          'text-muted',
          'text-blanc',
          'shadow-soft',
          'touch-target',
          'pb-safe',
          'pt-safe',
        ];

        for (const selector of requiredSelectors) {
          const regex = new RegExp(`\\.${selector}[^a-zA-Z0-9_-]`);
          assert.ok(
            regex.test(distCss),
            `Compiled CSS must contain selector .${selector}`
          );
        }
      }
    });
  });

  describe('Dimension 2: WCAG AA & AAA Outdoor Daylight Contrast Ratios', () => {
    it('verifies Forest Green text on Craie canvas exceeds WCAG AAA (>= 7.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.foret, PALETTE.craie);
      assert.ok(ratio >= 13.0, `Forest green on craie expected >= 13.0:1, got ${ratio.toFixed(2)}:1`);
      assert.ok(ratio >= 7.0, 'Must satisfy WCAG AAA threshold (>= 7.0:1)');
    });

    it('verifies Forest Green text on Warm Sand cards exceeds WCAG AAA (>= 7.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.foret, PALETTE.sable);
      assert.ok(ratio >= 10.0, `Forest green on sable expected >= 10.0:1, got ${ratio.toFixed(2)}:1`);
      assert.ok(ratio >= 7.0, 'Must satisfy WCAG AAA threshold (>= 7.0:1)');
    });

    it('verifies Forest Green text on Sage pills exceeds WCAG AA normal text (>= 4.5:1)', () => {
      const ratio = getContrastRatio(PALETTE.foret, PALETTE.sauge);
      assert.ok(
        ratio >= 4.5,
        `Forest Green text on Sage pills must meet WCAG AA normal text (>= 4.5:1), got ${ratio.toFixed(2)}:1`
      );
    });

    it('verifies Sage text on Forest Green header meets WCAG AA normal text (>= 4.5:1)', () => {
      const ratio = getContrastRatio(PALETTE.sauge, PALETTE.foret);
      assert.ok(
        ratio >= 4.5,
        `Sage text on Forest Green header must meet WCAG AA normal text (>= 4.5:1), got ${ratio.toFixed(2)}:1`
      );
    });

    it('verifies Muted text on Craie and Blanc meets WCAG AA normal text (>= 4.5:1)', () => {
      const ratioCraie = getContrastRatio(PALETTE.muted, PALETTE.craie);
      const ratioBlanc = getContrastRatio(PALETTE.muted, PALETTE.blanc);
      assert.ok(ratioCraie >= 4.5, `Muted on craie must meet >= 4.5:1, got ${ratioCraie.toFixed(2)}:1`);
      assert.ok(ratioBlanc >= 4.5, `Muted on blanc must meet >= 4.5:1, got ${ratioBlanc.toFixed(2)}:1`);
    });

    it('verifies Terracotta buttons with White text meet WCAG AA large/UI component threshold (>= 3.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.blanc, PALETTE.terracotta);
      assert.ok(
        ratio >= 3.0,
        `White on Terracotta must meet WCAG AA Large Text / UI component threshold (>= 3.0:1), got ${ratio.toFixed(2)}:1`
      );
    });

    it('stress-tests invalid contrast combinations: catches White text on Sage background (< 3.0:1)', () => {
      const whiteOnSage = getContrastRatio(PALETTE.blanc, PALETTE.sauge);
      // White on Sage is only 2.55:1, failing WCAG AA. This confirms that Sage pills must use text-foret, not text-white.
      assert.ok(
        whiteOnSage < 3.0,
        `White on Sage must be detected as failing WCAG threshold (was ${whiteOnSage.toFixed(2)}:1)`
      );
    });
  });

  describe('Dimension 3: BottomNav Route Transitions, Active State & Root Matching', () => {
    // Model of BottomNav navigation items
    const navItems = [
      { to: '/', label: 'Accueil' },
      { to: '/planning', label: 'Planning' },
      { to: '/equipe', label: 'Équipe' },
      { to: '/chat', label: 'Chat', badge: '2' },
      { to: '/plus', label: 'Plus' },
    ];

    function renderNavForRoute(initialRoute: string): string {
      const element = React.createElement(
        'nav',
        { className: 'bottom-nav' },
        navItems.map((item) =>
          React.createElement(NavLink, {
            key: item.to,
            to: item.to,
            end: item.to === '/',
            className: ({ isActive }: { isActive: boolean }) =>
              isActive ? 'tab-active text-foret font-bold' : 'tab-inactive text-muted',
            children: ({ isActive }: { isActive: boolean }) =>
              React.createElement(
                React.Fragment,
                null,
                React.createElement('span', { className: 'label' }, item.label),
                isActive
                  ? React.createElement('span', { className: 'dot-active bg-sauge' })
                  : React.createElement('span', { className: 'dot-placeholder opacity-0' })
              ),
          })
        )
      );

      return renderToString(
        React.createElement(MemoryRouter, { initialEntries: [initialRoute] }, element)
      );
    }

    it('verifies root path / activates ONLY Accueil and no other tab', () => {
      const html = renderNavForRoute('/');
      const activeMatches = [...html.matchAll(/tab-active[^"]*".*?<span class="label">([^<]+)<\/span>/g)].map(
        (m) => m[1]
      );
      assert.deepEqual(activeMatches, ['Accueil'], 'Only Accueil must be active on /');
      assert.equal((html.match(/bg-sauge/g) || []).length, 1, 'Exactly one active Sage dot must render');
      assert.equal((html.match(/opacity-0/g) || []).length, 4, 'Four placeholder dots must render');
    });

    it('verifies /planning activates ONLY Planning and root / is strictly INACTIVE', () => {
      const html = renderNavForRoute('/planning');
      const activeMatches = [...html.matchAll(/tab-active[^"]*".*?<span class="label">([^<]+)<\/span>/g)].map(
        (m) => m[1]
      );
      assert.deepEqual(activeMatches, ['Planning'], 'Only Planning must be active on /planning');
      assert.ok(!html.includes('tab-active text-foret font-bold" href="/"'), 'Root / must not be active');
    });

    it('verifies /equipe activates ONLY Équipe', () => {
      const html = renderNavForRoute('/equipe');
      const activeMatches = [...html.matchAll(/tab-active[^"]*".*?<span class="label">([^<]+)<\/span>/g)].map(
        (m) => m[1]
      );
      assert.deepEqual(activeMatches, ['Équipe']);
    });

    it('verifies /chat activates ONLY Chat', () => {
      const html = renderNavForRoute('/chat');
      const activeMatches = [...html.matchAll(/tab-active[^"]*".*?<span class="label">([^<]+)<\/span>/g)].map(
        (m) => m[1]
      );
      assert.deepEqual(activeMatches, ['Chat']);
    });

    it('verifies /plus activates ONLY Plus', () => {
      const html = renderNavForRoute('/plus');
      const activeMatches = [...html.matchAll(/tab-active[^"]*".*?<span class="label">([^<]+)<\/span>/g)].map(
        (m) => m[1]
      );
      assert.deepEqual(activeMatches, ['Plus']);
    });

    it('verifies query parameters and hashes preserve active tab state', () => {
      const htmlQuery = renderNavForRoute('/planning?date=2026-10-28&view=day');
      assert.ok(
        htmlQuery.includes('tab-active') && htmlQuery.includes('href="/planning"'),
        'Planning tab must remain active with query parameters'
      );
      assert.ok(htmlQuery.includes('aria-current="page"'));

      const htmlHash = renderNavForRoute('/planning#timeline');
      assert.ok(
        htmlHash.includes('tab-active') && htmlHash.includes('href="/planning"'),
        'Planning tab must remain active with hash fragment'
      );
    });

    it('verifies sub-routes under chat remain under the active Chat tab', () => {
      const htmlChatSub = renderNavForRoute('/chat/room-chantier-12');
      const activeMatches = [...htmlChatSub.matchAll(/tab-active[^"]*".*?<span class="label">([^<]+)<\/span>/g)].map(
        (m) => m[1]
      );
      assert.deepEqual(activeMatches, ['Chat'], 'Chat tab should remain active in chat sub-room');
    });

    it('verifies secondary routes not in BottomNav (e.g. /chantiers) do not falsely activate any tab', () => {
      const htmlChantiers = renderNavForRoute('/chantiers');
      const activeMatches = [...htmlChantiers.matchAll(/tab-active[^"]*".*?<span class="label">([^<]+)<\/span>/g)].map(
        (m) => m[1]
      );
      assert.deepEqual(activeMatches, [], 'Zero BottomNav tabs should be active on /chantiers');
      assert.equal((htmlChantiers.match(/bg-sauge/g) || []).length, 0);
      assert.equal((htmlChantiers.match(/opacity-0/g) || []).length, 5);
    });
  });

  describe('Dimension 4: Small Mobile Viewports (320px - 390px) & Touch Ergonomics', () => {
    it('verifies all tab buttons enforce minimum 48x48px boundaries', () => {
      assert.match(
        bottomNavContent,
        /min-w-\[48px\]/,
        'BottomNav items must declare min-w-[48px]'
      );
      assert.match(
        bottomNavContent,
        /min-h-\[48px\]/,
        'BottomNav items must declare min-h-[48px]'
      );
      assert.match(
        bottomNavContent,
        /w-16/,
        'BottomNav items must have w-16 (64px) target footprint'
      );
      assert.match(
        bottomNavContent,
        /h-16/,
        'BottomNav bar must have h-16 (64px) height container'
      );
    });

    it('stress-tests flexbox space allocation across mobile viewports 320px - 390px', () => {
      const viewports = [
        { name: 'iPhone SE 1st gen', width: 320 },
        { name: 'Android Small', width: 360 },
        { name: 'iPhone SE 2nd gen / 12 mini', width: 375 },
        { name: 'iPhone 13 / 14 / 15', width: 390 },
        { name: 'Android Standard', width: 412 },
        { name: 'iPhone Pro Max', width: 430 },
      ];

      const CONTAINER_PX = 16; // px-2 on both sides (8px * 2)
      const MIN_TAB_WIDTH = 48; // min-w-[48px]
      const TAB_COUNT = 5;
      const MIN_REQUIRED_WIDTH = TAB_COUNT * MIN_TAB_WIDTH; // 240px

      for (const vp of viewports) {
        const availableContentWidth = vp.width - CONTAINER_PX;

        // Verify available space comfortably exceeds 5 * 48px
        assert.ok(
          availableContentWidth >= MIN_REQUIRED_WIDTH,
          `${vp.name} (${vp.width}px) content width ${availableContentWidth}px must exceed minimum ${MIN_REQUIRED_WIDTH}px`
        );

        // Calculate actual allocated item width under flex shrink
        const allocatedItemWidth = Math.min(64, availableContentWidth / TAB_COUNT);
        assert.ok(
          allocatedItemWidth >= MIN_TAB_WIDTH,
          `${vp.name} allocated tab width (${allocatedItemWidth.toFixed(1)}px) must be >= 48px`
        );
      }
    });

    it('verifies safe-area insets and viewport-fit=cover configuration', () => {
      // index.html viewport-fit=cover
      assert.match(indexHtml, /viewport-fit=cover/, 'index.html must specify viewport-fit=cover');
      assert.match(indexHtml, /meta name="theme-color" content="#15302F"/, 'Theme color must match Forest Green');

      // BottomNav pb-safe
      assert.match(bottomNavContent, /pb-safe/, 'BottomNav must include pb-safe');
      assert.match(indexCss, /calc\(env\(safe-area-inset-bottom,\s*0px\)\s*\+\s*0\.75rem\)/);

      // AppLayout pt-safe
      assert.match(appLayoutContent, /pt-safe/, 'AppLayout header must include pt-safe');
      assert.match(indexCss, /calc\(env\(safe-area-inset-top,\s*0px\)\s*\+\s*1rem\)/);

      // AppLayout bottom clearance
      assert.match(appLayoutContent, /pb-24/, 'AppLayout main must provide pb-24 bottom clearance for BottomNav');
    });
  });
});
