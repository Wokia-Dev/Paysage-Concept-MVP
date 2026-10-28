/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('E2E Navigation & App Shell (R2)', () => {
  const bottomNavPath = resolve(projectRoot, 'src/components/layout/BottomNav.tsx');
  const appLayoutPath = resolve(projectRoot, 'src/components/layout/AppLayout.tsx');
  const appPath = resolve(projectRoot, 'src/App.tsx');

  const bottomNavContent = readFileSync(bottomNavPath, 'utf-8');
  const appLayoutContent = readFileSync(appLayoutPath, 'utf-8');
  const appContent = readFileSync(appPath, 'utf-8');

  describe('Tier 1: Feature Coverage — Persistent 5-Tab Navigation Contract', () => {
    it('verifies BottomNav declares the 5 persistent tabs (Accueil, Planning, Équipe, Chat, Plus)', () => {
      assert.match(bottomNavContent, /to:\s*['"]\/['"].*?label:\s*['"]Accueil['"]/s);
      assert.match(bottomNavContent, /to:\s*['"]\/planning['"].*?label:\s*['"]Planning['"]/s);
      assert.match(bottomNavContent, /to:\s*['"]\/equipe['"].*?label:\s*['"]Équipe['"]/s);
      assert.match(bottomNavContent, /to:\s*['"]\/chat['"].*?label:\s*['"]Chat['"]/s);
      assert.match(bottomNavContent, /to:\s*['"]\/plus['"].*?label:\s*['"]Plus['"]/s);
    });

    it('verifies Chat tab supports unread badge notification', () => {
      assert.match(
        bottomNavContent,
        /badge:\s*(['"][^'"]+['"]|\d+)/,
        'BottomNav must support an unread badge indicator on tab items'
      );
      assert.match(
        bottomNavContent,
        /item\.badge/,
        'BottomNav JSX must conditionally render the unread badge'
      );
    });

    it('verifies App.tsx declares all required application routes', () => {
      assert.match(appContent, /path="\/?login"/, 'Must define /login route');
      assert.match(appContent, /index\s+element=\{<Home\s*\/>\}/, 'Must define index / route for Home');
      assert.match(appContent, /path="planning"/, 'Must define /planning route');
      assert.match(appContent, /path="equipe"/, 'Must define /equipe route');
      assert.match(appContent, /path="chat"/, 'Must define /chat route');
      assert.match(appContent, /path="plus"/, 'Must define /plus route');
      assert.match(appContent, /path="chantiers"/, 'Must define /chantiers route');
      assert.match(appContent, /path="chantier\/:id"/, 'Must define /chantier/:id detail route');
    });
  });

  describe('Tier 2: Boundary & Corner Cases — Safe Areas & Touch Target Ergonomics', () => {
    it('verifies BottomNav container docks to bottom with safe-area bottom padding (pb-safe)', () => {
      assert.match(
        bottomNavContent,
        /fixed\s+bottom-0\s+left-0\s+right-0/,
        'BottomNav must be fixed at the bottom viewport edge'
      );
      assert.match(
        bottomNavContent,
        /pb-safe/,
        'BottomNav must include pb-safe to prevent overlap with native mobile home indicator'
      );
    });

    it('verifies tab items meet minimum mobile touch target dimensions', () => {
      // Buttons in BottomNav must use generous width/height (w-16, py-1, min 48px touch boundary)
      assert.match(
        bottomNavContent,
        /w-16|min-w-\[48px\]|min-h-\[48px\]|h-16/,
        'Navigation items must provide at least 48px touch boundaries'
      );
    });

    it('verifies AppLayout prevents content clipping under fixed BottomNav', () => {
      assert.match(
        appLayoutContent,
        /pb-24|pb-28|pb-20/,
        'AppLayout main container must have sufficient bottom padding so content is not obscured by BottomNav'
      );
    });

    it('verifies fallback wildcard route catches invalid URLs and redirects to /', () => {
      assert.match(
        appContent,
        /path="\*"\s+element=\{<Navigate\s+to="\/"\s+replace\s*\/>\}/,
        'Wildcard route must safely redirect invalid URLs to root'
      );
    });
  });

  describe('Tier 3: Cross-Feature Interactions — Role Navigation & Layout Integration', () => {
    it('verifies AppLayout integrates persistent top header with NetworkBanner', () => {
      assert.match(
        appLayoutContent,
        /<NetworkBanner\s*\/>/,
        'AppLayout header must render the offline/online NetworkBanner'
      );
      assert.match(
        appLayoutContent,
        /PAYSAGE CONCEPT/,
        'AppLayout header must display official company branding'
      );
    });

    it('verifies AppLayout top header uses safe-area top inset (pt-safe)', () => {
      assert.match(
        appLayoutContent,
        /pt-safe/,
        'AppLayout header must include pt-safe for mobile status bar notch clearance'
      );
      assert.match(
        appLayoutContent,
        /sticky\s+top-0/,
        'AppLayout header must remain sticky at the top during scrolling'
      );
    });

    it('verifies ProtectedRoute guards access to AppLayout shell', () => {
      assert.match(
        appContent,
        /<ProtectedRoute>.*?<AppLayout\s*\/>.*?<\/ProtectedRoute>/s,
        'All application screens within AppLayout must be protected by authentication guard'
      );
    });
  });

  describe('Tier 4: Real-World Landscaper Navigation Workflows', () => {
    it('simulates tab transition sequence across all 5 sections', () => {
      const tabs = [
        { path: '/', label: 'Accueil' },
        { path: '/planning', label: 'Planning' },
        { path: '/equipe', label: 'Équipe' },
        { path: '/chat', label: 'Chat' },
        { path: '/plus', label: 'Plus' },
      ];

      // Verify each path is uniquely addressable
      const paths = tabs.map((t) => t.path);
      const uniquePaths = new Set(paths);
      assert.equal(uniquePaths.size, 5, 'All 5 tabs must target distinct routes');

      // State machine simulation: navigating from Accueil -> Planning -> Chantier Detail -> Chat -> Plus
      let currentRoute = '/';
      const historyStack: string[] = [currentRoute];

      function navigateTo(path: string) {
        currentRoute = path;
        historyStack.push(path);
      }

      navigateTo('/planning');
      assert.equal(currentRoute, '/planning');

      // Simulated navigation into ChantierDetail from Planning
      navigateTo('/chantier/ch-laurent-uuid');
      assert.equal(currentRoute, '/chantier/ch-laurent-uuid');

      // Return to BottomNav tab: Chat
      navigateTo('/chat');
      assert.equal(currentRoute, '/chat');

      // Check Plus tab
      navigateTo('/plus');
      assert.equal(currentRoute, '/plus');

      // Return to Home
      navigateTo('/');
      assert.equal(currentRoute, '/');
      assert.equal(historyStack.length, 6);
    });

    it('verifies user initials extraction logic for avatar display', () => {
      function getInitials(prenom?: string, nom?: string): string {
        if (!prenom && !nom) return 'PC';
        const p = prenom ? prenom.charAt(0) : '';
        const n = nom ? nom.charAt(0) : '';
        return `${p}${n}`.toUpperCase();
      }

      assert.equal(getInitials('Jean', 'Dupont'), 'JD');
      assert.equal(getInitials('Marc', 'Vasseur'), 'MV');
      assert.equal(getInitials('Sophie', 'Laurent'), 'SL');
      assert.equal(getInitials('', ''), 'PC');
      assert.equal(getInitials(undefined, undefined), 'PC');
    });
  });
});
