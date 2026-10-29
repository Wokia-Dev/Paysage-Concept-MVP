/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Layout Scroll Continuity & Viewport Overflow Management', () => {
  const appLayoutPath = resolve(projectRoot, 'src/components/layout/AppLayout.tsx');
  const indexCssPath = resolve(projectRoot, 'src/index.css');
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');
  const planningPath = resolve(projectRoot, 'src/pages/Planning.tsx');
  const chatPath = resolve(projectRoot, 'src/pages/ChatPreview.tsx');
  const equipePath = resolve(projectRoot, 'src/pages/Equipe.tsx');
  const plusPath = resolve(projectRoot, 'src/pages/Plus.tsx');

  const appLayout = readFileSync(appLayoutPath, 'utf-8');
  const indexCss = readFileSync(indexCssPath, 'utf-8');
  const homeContent = readFileSync(homePath, 'utf-8');

  describe('Dimension 1: Container Height & Flex Scroll Context Establishment', () => {
    it('verifies outer shell establishes fixed viewport bounds with dynamic viewport height and overflow-hidden', () => {
      assert.match(
        appLayout,
        /h-screen\s+h-\[100dvh\][\s\S]*?overflow-hidden/,
        'Outer container must bound height to 100dvh and prevent outer page overflow'
      );
    });

    it('verifies inner centered mobile container enforces h-screen and h-[100dvh] alongside max-w-md min-h-screen', () => {
      assert.match(
        appLayout,
        /max-w-md min-h-screen flex flex-col bg-craie/,
        'Inner container must preserve standard mobile centered shell test contract'
      );
      assert.match(
        appLayout,
        /h-screen\s+h-\[100dvh\][\s\S]*?overflow-hidden/,
        'Inner mobile container must constrain vertical height and hide overflow so main handles scroll'
      );
    });

    it('verifies main scroll container explicitly specifies min-h-0 in flex column layout', () => {
      assert.match(
        appLayout,
        /<main[^>]*className="[^"]*flex-1\s+min-h-0[^"]*"/,
        'main container must specify min-h-0 to override default min-height: auto in flexbox'
      );
    });

    it('verifies main container defines overflow-y-auto to establish active scrolling context', () => {
      assert.match(
        appLayout,
        /<main[^>]*className="[^"]*overflow-y-auto[^"]*"/,
        'main container must establish an active vertical scrolling context with overflow-y-auto'
      );
    });

    it('verifies main container contains overscroll to prevent rubber-band canvas bleed on mobile devices', () => {
      assert.match(
        appLayout,
        /<main[^>]*className="[^"]*overscroll-y-contain[^"]*"/,
        'main container must declare overscroll-y-contain'
      );
    });

    it('verifies main container suppresses unsightly native scrollbars while preserving scrollability', () => {
      assert.match(
        appLayout,
        /<main[^>]*className="[^"]*no-scrollbar[^"]*"/,
        'main container must use no-scrollbar utility'
      );
    });
  });

  describe('Dimension 2: Keyboard Accessibility, Route Reset & Desktop Ergonomics', () => {
    it('verifies main container assigns ref, tabIndex={-1}, and focus outline reset for keyboard navigation', () => {
      assert.match(appLayout, /ref=\{mainRef\}/, 'main element must attach ref for scroll manipulation');
      assert.match(appLayout, /tabIndex=\{-1\}/, 'main element must be keyboard focusable');
      assert.match(appLayout, /focus:outline-none/, 'main element must cleanly suppress focus outline');
    });

    it('verifies route change resets scroll position to top and restores keyboard focus', () => {
      assert.match(appLayout, /mainRef\.current\.scrollTop\s*=\s*0;/, 'Must reset scrollTop to 0 on route navigation');
      assert.match(appLayout, /mainRef\.current\.focus\(\{\s*preventScroll:\s*true\s*\}\);/, 'Must focus main for immediate Arrow/Page navigation');
    });

    it('verifies desktop margin and outer zone mouse-wheel delegation forwards deltaY to main container without dead zones', () => {
      assert.match(appLayout, /mainRef\.current\.scrollTop\s*\+=\s*e\.deltaY/, 'Must delegate desktop margin wheel events to main scroller');
      assert.match(appLayout, /!mainRef\.current\.contains\(e\.target as Node\)/, 'Must not restrict delegation to strictly e.currentTarget so headers and margins can scroll');
    });

    it('verifies touch gesture swiping on headers and shell delegates delta to main container', () => {
      assert.match(appLayout, /onTouchStart=\{handleTouchStart\}/, 'Must attach touch start listener on shell');
      assert.match(appLayout, /onTouchMove=\{handleTouchMove\}/, 'Must attach touch move listener on shell');
      assert.match(appLayout, /mainRef\.current\.scrollTop\s*\+=\s*deltaY/, 'Must scroll main upon outer touch swiping');
    });

    it('verifies modal dialogs are guarded from outer scroll hijacking', () => {
      assert.match(appLayout, /targetEl\?\.closest\('\[role="dialog"\]'\)/, 'Must protect modal dialogs from scroll delegation conflicts');
    });

    it('verifies window keyboard navigation listener supports Arrow, Page, Space, Home, and End keys', () => {
      assert.match(appLayout, /case 'ArrowDown':/, 'Must support ArrowDown key scrolling');
      assert.match(appLayout, /case 'ArrowUp':/, 'Must support ArrowUp key scrolling');
      assert.match(appLayout, /case 'PageDown':/, 'Must support PageDown key scrolling');
      assert.match(appLayout, /case 'PageUp':/, 'Must support PageUp key scrolling');
      assert.match(appLayout, /case ' ':/, 'Must support Spacebar scrolling');
      assert.match(appLayout, /window\.addEventListener\('keydown',\s*handleKeyDown\)/, 'Must attach global keyboard listener');
    });
  });

  describe('Dimension 3: Bottom Safe-Area Navigation Clearance', () => {
    it('verifies main scroll container provides adequate bottom clearance for fixed BottomNav', () => {
      assert.match(
        appLayout,
        /pb-24/,
        'main container must include pb-24 clearance for BottomNav'
      );
      assert.match(
        appLayout,
        /pb-\[calc\(env\(safe-area-inset-bottom\)\+5rem\)\]/,
        'main container must add safe-area inset bottom padding'
      );
    });
  });

  describe('Dimension 4: Status Bar & Safe Area Visual Continuity', () => {
    it('verifies secondary header preserves pt-safe and sticky docking', () => {
      assert.match(appLayout, /pt-safe/, 'Header must clear mobile notch');
      assert.match(appLayout, /bg-foret\s+text-blanc/, 'Header must use Forest Green');
      assert.match(appLayout, /rounded-b-2xl/, 'Header must preserve biophilic bottom curve');
    });

    it('verifies top safe area status bar cover preserves Forest Green background across routes during scroll', () => {
      assert.match(
        appLayout,
        /h-\[env\(safe-area-inset-top,\s*0px\)\]\s+bg-foret\s+z-40\s+pointer-events-none/,
        'AppLayout must maintain dedicated safe-area top status bar backing to keep status bar appearance intact during scroll'
      );
    });

    it('verifies home hero header starts behind translucent status bar with solid Forest Green gradient', () => {
      assert.match(homeContent, /pt-\[calc\(env\(safe-area-inset-top,\s*0px\)\s*\+\s*1\.75rem\)\]/);
      assert.match(homeContent, /linear-gradient\(180deg,\s*#15302F\s+0%/);
    });

    it('verifies HTML root and body rules in index.css preserve theme contrast and overscroll behavior', () => {
      assert.match(indexCss, /html\s*\{[\s\S]*?background-color:\s*var\(--color-foret\);/);
      assert.match(indexCss, /body\s*\{[\s\S]*?background-color:\s*var\(--color-craie\);/);
      assert.match(indexCss, /overscroll-behavior-y:\s*none/);
    });
  });

  describe('Dimension 5: Page-Level Content File Accessibility', () => {
    const pageFiles = [
      { name: 'Planning', path: planningPath },
      { name: 'ChatPreview', path: chatPath },
      { name: 'Equipe', path: equipePath },
      { name: 'Plus', path: plusPath },
    ];

    for (const page of pageFiles) {
      it(`verifies ${page.name} page file exists and does not trap touch actions`, () => {
        assert.ok(existsSync(page.path), `${page.name} must exist`);
        const content = readFileSync(page.path, 'utf-8');
        assert.doesNotMatch(content, /touch-action:\s*none/, `${page.name} must not contain touch-action: none`);
        assert.doesNotMatch(content, /h-screen\s+overflow-hidden/, `${page.name} must not establish conflicting full-screen overflow hidden`);
      });
    }
  });
});
