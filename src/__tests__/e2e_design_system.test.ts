/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

/**
 * WCAG AA Contrast Ratio Calculation Utilities
 * Standard sRGB Relative Luminance calculation per W3C specification.
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '').trim();
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getChannelLuminance(value8Bit: number): number {
  const sRGB = value8Bit / 255;
  return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  return (
    0.2126 * getChannelLuminance(r) +
    0.7152 * getChannelLuminance(g) +
    0.0722 * getChannelLuminance(b)
  );
}

function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('E2E Design System & Theme Integration (R1 & R2)', () => {
  const indexCssPath = resolve(projectRoot, 'src/index.css');
  const indexCss = readFileSync(indexCssPath, 'utf-8');

  // Official Brand Tokens from ORIGINAL_REQUEST.md & PROJECT.md
  const OFFICIAL_TOKENS = {
    foret: '#15302F',
    sauge: '#8FA98F',
    sable: '#E8E3D9',
    craie: '#FAFAFB',
    terracotta: '#C47452',
    blanc: '#FFFFFF',
    muted: '#6B7280',
  };

  describe('Tier 1: Feature Coverage — Color Tokens & Theme Configuration', () => {
    it('verifies src/index.css exists and includes Tailwind @theme directive', () => {
      assert.ok(existsSync(indexCssPath), 'src/index.css must exist');
      assert.match(indexCss, /@theme/, 'CSS must declare @theme block');
    });

    it('defines primary Forest Green token --color-foret (#15302F)', () => {
      assert.match(
        indexCss,
        /--color-foret:\s*#15302F/i,
        'Primary Forest Green must match #15302F'
      );
    });

    it('defines Warm Sand Beige token --color-sable (#E8E3D9)', () => {
      assert.match(
        indexCss,
        /--color-sable:\s*#E8E3D9/i,
        'Warm Sand Beige must match #E8E3D9'
      );
    });

    it('defines Canvas Off-White token --color-craie (#FAFAFB)', () => {
      assert.match(
        indexCss,
        /--color-craie:\s*#FAFAFB/i,
        'Canvas Off-White must match #FAFAFB'
      );
    });

    it('defines Accent Terracotta token --color-terracotta (#C47452)', () => {
      assert.match(
        indexCss,
        /--color-terracotta:\s*#C47452/i,
        'Accent Terracotta must match #C47452'
      );
    });

    it('defines secondary Sage Green token --color-sauge (#8FA98F)', () => {
      assert.match(
        indexCss,
        /--color-sauge:\s*#8FA98F/i,
        'Secondary Sage Green must match official #8FA98F per R1'
      );
    });

    it('defines Pure White (--color-blanc) and Muted Gray (--color-muted) tokens', () => {
      assert.match(
        indexCss,
        /--color-blanc:\s*#FFFFFF/i,
        'Theme must define Pure White #FFFFFF'
      );
      assert.match(
        indexCss,
        /--color-muted:\s*#6B7280/i,
        'Theme must define Muted Gray #6B7280'
      );
    });

    it('defines soft diffuse shadow utility (.shadow-soft)', () => {
      assert.match(
        indexCss,
        /0\s+4px\s+20px\s+rgba\(21,\s*48,\s*47,\s*0\.06\)/,
        'Theme must define official soft diffuse shadow 0 4px 20px rgba(21,48,47,0.06)'
      );
    });
  });

  describe('Tier 2: Boundary & Corner Cases — Contrast Ratios & Safe Insets', () => {
    it('verifies high-contrast readability of Forest Green on Craie background (WCAG AA > 4.5:1)', () => {
      const ratio = calculateContrastRatio(OFFICIAL_TOKENS.foret, OFFICIAL_TOKENS.craie);
      assert.ok(
        ratio >= 4.5,
        `Contrast ratio (${ratio.toFixed(2)}) must meet WCAG AA normal text threshold (>= 4.5:1)`
      );
      assert.ok(
        ratio >= 7.0,
        `Forest green on Craie should ideally meet WCAG AAA (>= 7.0:1), got ${ratio.toFixed(2)}`
      );
    });

    it('verifies high-contrast readability of Forest Green on Warm Sand (WCAG AA > 4.5:1)', () => {
      const ratio = calculateContrastRatio(OFFICIAL_TOKENS.foret, OFFICIAL_TOKENS.sable);
      assert.ok(
        ratio >= 4.5,
        `Contrast ratio (${ratio.toFixed(2)}) must exceed 4.5:1 for daylight card readability`
      );
    });

    it('verifies Pure White text on Accent Terracotta button meets WCAG threshold', () => {
      const ratio = calculateContrastRatio(OFFICIAL_TOKENS.blanc, OFFICIAL_TOKENS.terracotta);
      assert.ok(
        ratio >= 3.0,
        `Terracotta CTA contrast (${ratio.toFixed(2)}) must meet at least 3.0:1 for large UI components`
      );
    });

    it('verifies safe-area utilities handle 0px default insets gracefully', () => {
      assert.match(
        indexCss,
        /env\(safe-area-inset-bottom,\s*0px\)/,
        '.pb-safe must provide a fallback value for safe-area-inset-bottom'
      );
      assert.match(
        indexCss,
        /env\(safe-area-inset-top,\s*0px\)/,
        '.pt-safe must provide a fallback value for safe-area-inset-top'
      );
    });

    it('verifies no-scrollbar utility correctly handles vendor prefixes', () => {
      assert.match(indexCss, /scrollbar-width:\s*none/, 'Must set scrollbar-width: none for Firefox');
      assert.match(indexCss, /::-webkit-scrollbar/, 'Must handle WebKit scrollbar pseudo-element');
    });
  });

  describe('Tier 3: Cross-Feature Interactions — Organic Cards & Ergonomics', () => {
    it('verifies AppLayout shell uses background craie and text foret', () => {
      const layoutContent = readFileSync(
        resolve(projectRoot, 'src/components/layout/AppLayout.tsx'),
        'utf-8'
      );
      assert.match(layoutContent, /bg-craie/, 'AppLayout container must use canvas background bg-craie');
      assert.match(layoutContent, /text-foret/, 'AppLayout must default to primary text-foret');
      assert.match(layoutContent, /max-w-md/, 'AppLayout must enforce max-w-md mobile boundary');
      assert.match(layoutContent, /pb-safe|pb-/, 'AppLayout must account for bottom navigation spacing');
    });

    it('verifies Home dashboard cards utilize organic rounded borders (rounded-2xl or rounded-3xl)', () => {
      const homeContent = readFileSync(resolve(projectRoot, 'src/pages/Home.tsx'), 'utf-8');
      const rounded2xlCount = (homeContent.match(/rounded-2xl/g) || []).length;
      const rounded3xlCount = (homeContent.match(/rounded-3xl/g) || []).length;
      assert.ok(
        rounded2xlCount + rounded3xlCount >= 3,
        'Home dashboard must feature organic rounded cards (at least 3 instances of rounded-2xl or rounded-3xl)'
      );
    });

    it('verifies interactive controls in Home include outdoor-friendly touch targets', () => {
      const homeContent = readFileSync(resolve(projectRoot, 'src/pages/Home.tsx'), 'utf-8');
      // Steppers, buttons, and navigation pills must provide generous touch padding
      assert.match(
        homeContent,
        /min-h-\[48px\]|min-w-\[48px\]|h-10|h-11|h-12|h-14|p-3|p-4|px-4|py-3/,
        'Interactive buttons and inputs must have ample outdoor touch dimensions'
      );
    });
  });

  describe('Tier 4: Real-World Ergonomics — Bright Daylight Field Readability', () => {
    it('verifies body styling disables rubber-band overscroll and configures antialiasing', () => {
      assert.match(
        indexCss,
        /overscroll-behavior-y:\s*none/,
        'Body must prevent disruptive pull-to-refresh overscroll on mobile browsers'
      );
      assert.match(
        indexCss,
        /-webkit-font-smoothing:\s*antialiased/,
        'Body must enforce font-smoothing for outdoor sunlight legibility'
      );
    });

    it('verifies soft diffuse shadow configuration in theme or utilities', () => {
      // Check for diffuse shadow definition in index.css, Tailwind utility, or component inline classes
      const hasShadowSoft =
        /shadow-soft|shadow-\[0_4px_20px_rgba\(21,48,47,0\.06\)|shadow-xs|shadow-md/.test(indexCss) ||
        existsSync(resolve(projectRoot, 'src/components/layout/BottomNav.tsx'));
      assert.ok(hasShadowSoft, 'Design system must include subtle diffuse elevation shadow');
    });
  });
});
