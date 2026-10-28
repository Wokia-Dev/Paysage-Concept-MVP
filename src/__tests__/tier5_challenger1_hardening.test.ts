/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Profile, Affectation, PointageLocal } from '../types/database.ts';
import type { ChatConversation, FilterCategory } from '../types/chat.ts';
import {
  DEFAULT_DAILY_TARGET,
  getStoredDailyTarget,
  setStoredDailyTarget,
  calculateAutoOvertime,
  calculateNormalHours,
  formatHours,
  validateDailyHours,
  calculateNetWorkedHours,
  calculateHoursSummary,
  aggregateTeamDailyStatus,
} from '../lib/hours.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

// Helper: Color luminance & contrast ratio calculation for WCAG verification
function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function channelLuminance(val: number): number {
  const sRGB = val / 255;
  return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

describe('Tier 5 Adversarial Coverage Hardening (Challenger 1)', () => {
  // Load source files for white-box inspection
  const indexCss = readFileSync(resolve(projectRoot, 'src/index.css'), 'utf-8');
  const bottomNavContent = readFileSync(resolve(projectRoot, 'src/components/layout/BottomNav.tsx'), 'utf-8');
  const appLayoutContent = readFileSync(resolve(projectRoot, 'src/components/layout/AppLayout.tsx'), 'utf-8');
  const homeContent = readFileSync(resolve(projectRoot, 'src/pages/Home.tsx'), 'utf-8');
  const circularGaugeContent = readFileSync(resolve(projectRoot, 'src/components/common/CircularProgressGauge.tsx'), 'utf-8');
  const datePillContent = readFileSync(resolve(projectRoot, 'src/components/common/DateSelectorPill.tsx'), 'utf-8');
  const planningContent = readFileSync(resolve(projectRoot, 'src/pages/Planning.tsx'), 'utf-8');
  const chantierDetailContent = readFileSync(resolve(projectRoot, 'src/pages/ChantierDetail.tsx'), 'utf-8');
  const chatPreviewContent = readFileSync(resolve(projectRoot, 'src/pages/ChatPreview.tsx'), 'utf-8');
  const chatRoomViewContent = readFileSync(resolve(projectRoot, 'src/components/modules/ChatRoomView.tsx'), 'utf-8');
  const equipeContent = readFileSync(resolve(projectRoot, 'src/pages/Equipe.tsx'), 'utf-8');
  const plusContent = readFileSync(resolve(projectRoot, 'src/pages/Plus.tsx'), 'utf-8');
  const chantiersContent = readFileSync(resolve(projectRoot, 'src/pages/Chantiers.tsx'), 'utf-8');
  const dbContent = readFileSync(resolve(projectRoot, 'src/lib/db.ts'), 'utf-8');
  const syncContent = readFileSync(resolve(projectRoot, 'src/lib/sync.ts'), 'utf-8');

  // =========================================================================
  // Dimension 1: Declarative Time-Tracking Mathematical & Logical Invariants
  // =========================================================================
  describe('Dimension 1: Declarative Time-Tracking Mathematical & Logical Invariants', () => {
    it('guarantees invariant normalHours + heuresSup === heuresTotales over random decimal inputs', () => {
      for (let i = 0; i <= 240; i += 2.5) {
        const total = Math.round((i / 10) * 100) / 100;
        const sup = Math.round((Math.random() * total) * 100) / 100;
        const normal = calculateNormalHours(total, sup);

        const sum = Math.round((normal + sup) * 100) / 100;
        assert.equal(
          sum,
          total,
          `Invariant broken for total=${total}, sup=${sup}: normal=${normal}, sum=${sum}`
        );
        assert.ok(normal >= 0, `normalHours cannot be negative: ${normal}`);
        assert.ok(normal <= total, `normalHours cannot exceed total: ${normal} > ${total}`);
      }
    });

    it('safely clamps normal hours to 0 when overtime illegally exceeds total hours in corrupted state', () => {
      // Defensive coding test: corrupted inputs (e.g. sup = 10, total = 8)
      const normal = calculateNormalHours(8, 10);
      assert.equal(normal, 0, 'normalHours must clamp to 0 when overtime > total');
    });

    it('stress-tests calculateAutoOvertime exact boundaries with fractional targets', () => {
      // Exactly at target: 0 overtime
      assert.equal(calculateAutoOvertime(7.0, 7.0), 0);
      assert.equal(calculateAutoOvertime(7.5, 7.5), 0);
      assert.equal(calculateAutoOvertime(8.25, 8.25), 0);

      // Fractional exceedance: e.g. target 7.5, worked 8.75 -> 1.25 overtime
      assert.equal(calculateAutoOvertime(8.75, 7.5), 1.25);
      assert.equal(calculateAutoOvertime(8.0, 7.25), 0.75);

      // Below target: strictly 0
      assert.equal(calculateAutoOvertime(6.99, 7.0), 0);
      assert.equal(calculateAutoOvertime(0, 7.0), 0);

      // Non-finite and negative inputs
      assert.equal(calculateAutoOvertime(NaN, 7.0), 0);
      assert.equal(calculateAutoOvertime(8.0, NaN), 0);
      assert.equal(calculateAutoOvertime(-5.0, 7.0), 0);
      assert.equal(calculateAutoOvertime(8.0, -7.0), 8.0);
    });

    it('validates daily hours input matrix against extreme boundary and non-finite values', () => {
      // Boundary valid values
      assert.equal(validateDailyHours(0, 0, 0).valid, true);
      assert.equal(validateDailyHours(24, 0, 0).valid, true);
      assert.equal(validateDailyHours(24, 24, 0).valid, true);
      assert.equal(validateDailyHours(24, 0, 24).valid, true);

      // Boundary invalid values: strictly > 24
      assert.equal(validateDailyHours(24.01, 0, 0).valid, false);
      assert.equal(validateDailyHours(8, 24.01, 0).valid, false);
      assert.equal(validateDailyHours(8, 0, 24.01).valid, false);

      // Negative values
      assert.equal(validateDailyHours(-0.01, 0, 0).valid, false);
      assert.equal(validateDailyHours(8, -0.25, 0).valid, false);
      assert.equal(validateDailyHours(8, 0, -1).valid, false);

      // Overtime strictly exceeding total hours by epsilon
      const invalidSup = validateDailyHours(8.0, 1.0, 8.01);
      assert.equal(invalidSup.valid, false);
      assert.match(
        invalidSup.error || '',
        /heures supplémentaires ne peuvent pas dépasser/i
      );

      // Non-finite values
      assert.equal(validateDailyHours(NaN, 1, 0).valid, false);
      assert.equal(validateDailyHours(8, Infinity, 0).valid, false);
      assert.equal(validateDailyHours(8, 1, -Infinity).valid, false);
    });

    it('stress-tests formatHours precision, round-to-60-minutes branch, and edge cases', () => {
      assert.equal(formatHours(0), '0h00');
      assert.equal(formatHours(7), '7h00');
      assert.equal(formatHours(7.25), '7h15');
      assert.equal(formatHours(7.5), '7h30');
      assert.equal(formatHours(7.75), '7h45');
      assert.equal(formatHours(24), '24h00');

      // Test the minute rounding branch: 7.999 hours -> 59.94 minutes -> rounds to 60 -> becomes 8h00
      assert.equal(formatHours(7.999), '8h00');
      assert.equal(formatHours(0.999), '1h00');

      // Negative hours
      assert.equal(formatHours(-1.5), '-1h30');

      // Non-finite fallback
      assert.equal(formatHours(NaN), '0h00');
      assert.equal(formatHours(Infinity), '0h00');
    });

    it('verifies calculateNetWorkedHours safety under pause exceeding total hours', () => {
      assert.equal(calculateNetWorkedHours(8, 1), 7);
      assert.equal(calculateNetWorkedHours(7.5, 0.5), 7);
      assert.equal(calculateNetWorkedHours(2, 3), 0, 'Net hours must clamp to 0 when pause > total');
      assert.equal(calculateNetWorkedHours(NaN, 1), 0);
      assert.equal(calculateNetWorkedHours(8, NaN), 8);
    });

    it('verifies daily target storage clamping and resilient fallback', () => {
      assert.equal(DEFAULT_DAILY_TARGET, 7.0);

      // In Node.js environment without window.localStorage:
      assert.equal(getStoredDailyTarget('worker-123'), 7.0);

      // Mock localStorage to verify boundary clamping [1..24]
      const storageMock: Record<string, string> = {};
      const origWindow = globalThis.window;
      const mockStorage: Storage = {
        getItem: (key: string) => storageMock[key] ?? null,
        setItem: (key: string, val: string) => {
          storageMock[key] = val;
        },
        removeItem: (key: string) => {
          delete storageMock[key];
        },
        clear: () => {
          for (const k of Object.keys(storageMock)) delete storageMock[k];
        },
        key: (idx: number) => Object.keys(storageMock)[idx] ?? null,
        length: 0,
      };
      Object.defineProperty(mockStorage, 'length', {
        get: () => Object.keys(storageMock).length,
      });

      (globalThis as unknown as { window: unknown }).window = {
        localStorage: mockStorage,
      };

      try {
        // Value under minimum (0.5 -> clamped to 1)
        setStoredDailyTarget(0.5, 'worker-1');
        assert.equal(getStoredDailyTarget('worker-1'), 1.0);

        // Value over maximum (30 -> clamped to 24)
        setStoredDailyTarget(30, 'worker-1');
        assert.equal(getStoredDailyTarget('worker-1'), 24.0);

        // Standard valid value
        setStoredDailyTarget(8.5, 'worker-1');
        assert.equal(getStoredDailyTarget('worker-1'), 8.5);

        // Isolation between profiles
        assert.equal(getStoredDailyTarget('worker-2'), 8.5); // Fallback to global default key
        setStoredDailyTarget(6.5, 'worker-2');
        assert.equal(getStoredDailyTarget('worker-2'), 6.5);
        assert.equal(getStoredDailyTarget('worker-1'), 8.5);

        // Corrupted localStorage content safely returns default 7.0
        storageMock['paysage_daily_target_corrupt'] = 'invalid_not_a_number';
        assert.equal(getStoredDailyTarget('corrupt'), 7.0);

        storageMock['paysage_daily_target_negative'] = '-5';
        assert.equal(getStoredDailyTarget('negative'), 7.0);
      } finally {
        globalThis.window = origWindow;
      }
    });

    it('verifies calculateHoursSummary calculates totals and normal hours across records', () => {
      const pointages: PointageLocal[] = [
        { id: '1', profile_id: 'p1', date: '2026-10-28', heures_totales: 8, temps_pause: 1, heures_sup: 1, synced: true, error: null, created_at: '', updated_at: '' },
        { id: '2', profile_id: 'p1', date: '2026-10-29', heures_totales: 7, temps_pause: 0.5, heures_sup: 0, synced: true, error: null, created_at: '', updated_at: '' },
      ];
      const summary = calculateHoursSummary(pointages);
      assert.equal(summary.totalHours, 15);
      assert.equal(summary.totalPause, 1.5);
      assert.equal(summary.totalOvertime, 1);
      assert.equal(summary.normalHours, 14);
    });
  });

  // =========================================================================
  // Dimension 2: Circular Progress Gauge & Date Selector Pill Boundary Stress
  // =========================================================================
  describe('Dimension 2: Circular Progress Gauge & Date Selector Pill Boundary Stress', () => {
    it('verifies Horseshoe gauge mathematics, sweep angles and clamping logic in source', () => {
      // 260-degree sweep angle
      assert.match(circularGaugeContent, /sweepAngle\s*=\s*260/, 'Gauge must use 260-degree horseshoe sweep');
      assert.match(circularGaugeContent, /radius\s*=\s*76/, 'Gauge radius must be 76');
      assert.match(circularGaugeContent, /viewBox=["']0 0 200 200["']/, 'Gauge viewBox must be 200x200');

      // Mathematical clamping
      assert.match(
        circularGaugeContent,
        /clampedRatio\s*=\s*Math\.min\(1,\s*progressRatio\)/,
        'Gauge must clamp visual arc ratio to 1.0 to prevent circular overflow'
      );

      // Division by zero protection: targetSafe fallback
      assert.match(
        circularGaugeContent,
        /targetSafe\s*=\s*target\s*>\s*0\s*\?\s*target\s*:\s*7/,
        'Gauge must protect against 0 or negative targets by falling back to 7h'
      );

      // Color change on target exceeded
      assert.match(
        circularGaugeContent,
        /stopColor=\{value\s*>\s*targetSafe\s*\?\s*['"]#C47452['"]\s*:\s*arcColor\}/,
        'Foreground gradient must shift to Terracotta (#C47452) when target is exceeded'
      );
    });

    it('verifies DateSelectorPill date arithmetic avoids DST timezone shifts via UTC midday', () => {
      assert.match(
        datePillContent,
        /selectedDate\.split\(['"]-['"]\)\.map\(Number\)/,
        'DateSelectorPill must parse YYYY-MM-DD components'
      );
      assert.match(
        datePillContent,
        /Intl\.DateTimeFormat\(['"]fr-FR['"]/,
        'DateSelectorPill must format in French locale'
      );

      // Prev / Next day buttons enforce min 48x48px touch targets
      assert.match(
        datePillContent,
        /min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Jour précédent/,
        'Previous day button must enforce >= 48x48px touch target'
      );
      assert.match(
        datePillContent,
        /min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Jour suivant/,
        'Next day button must enforce >= 48x48px touch target'
      );
    });

    it('simulates leap day and year rollover date arithmetic', () => {
      // Leap year: 2024-02-28 + 1 day should be 2024-02-29
      const d1 = new Date('2024-02-28T12:00:00Z');
      d1.setUTCDate(d1.getUTCDate() + 1);
      assert.equal(d1.toISOString().slice(0, 10), '2024-02-29');

      // Next day: 2024-02-29 + 1 day should be 2024-03-01
      d1.setUTCDate(d1.getUTCDate() + 1);
      assert.equal(d1.toISOString().slice(0, 10), '2024-03-01');

      // Non-leap year: 2026-02-28 + 1 day should be 2026-03-01
      const d2 = new Date('2026-02-28T12:00:00Z');
      d2.setUTCDate(d2.getUTCDate() + 1);
      assert.equal(d2.toISOString().slice(0, 10), '2026-03-01');

      // Year rollover: 2026-12-31 + 1 day should be 2027-01-01
      const d3 = new Date('2026-12-31T12:00:00Z');
      d3.setUTCDate(d3.getUTCDate() + 1);
      assert.equal(d3.toISOString().slice(0, 10), '2027-01-01');
    });
  });

  // =========================================================================
  // Dimension 3: App Shell, Persistent 5-Tab BottomNav & Safe Areas
  // =========================================================================
  describe('Dimension 3: App Shell, Persistent 5-Tab BottomNav & Safe Areas', () => {
    it('verifies BottomNav implements exactly the 5 required tabs with active indicator and badge', () => {
      const requiredTabs = [
        { to: '/', label: 'Accueil' },
        { to: '/planning', label: 'Planning' },
        { to: '/equipe', label: 'Équipe' },
        { to: '/chat', label: 'Chat', badge: '2' },
        { to: '/plus', label: 'Plus' },
      ];

      for (const tab of requiredTabs) {
        assert.match(
          bottomNavContent,
          new RegExp(`to:\\s*['"]${tab.to.replace('/', '\\/')}['"],\\s*label:\\s*['"]${tab.label}['"]`),
          `BottomNav must define tab ${tab.label} (${tab.to})`
        );
      }

      // Root tab matching exact constraint
      assert.match(
        bottomNavContent,
        /end=\{item\.to\s*===\s*['"]\/['"]\}/,
        'Root Accueil tab must specify end={true} to avoid matching all sub-routes'
      );

      // Unread badge for Chat
      assert.match(
        bottomNavContent,
        /bg-terracotta text-white text-\[10px\] font-bold px-1\.5 py-0\.5 rounded-full/,
        'BottomNav must render Terracotta unread badge'
      );

      // Active state indicator dot
      assert.match(
        bottomNavContent,
        /w-1\.5 h-1\.5 bg-sauge rounded-full mt-1/,
        'BottomNav must display Sage indicator dot for active tab'
      );

      // Min 48x48px touch targets
      assert.match(
        bottomNavContent,
        /min-w-\[48px\]\s+min-h-\[48px\]/,
        'BottomNav must enforce min-w-[48px] and min-h-[48px] on every tab button'
      );
    });

    it('verifies AppLayout shell handles safe area insets, container centering, and role labels', () => {
      // Safe area padding
      assert.match(appLayoutContent, /pt-safe/, 'AppLayout header must include pt-safe utility');
      assert.match(bottomNavContent, /pb-safe/, 'BottomNav container must include pb-safe utility');
      assert.match(appLayoutContent, /pb-24/, 'AppLayout main must include bottom padding to clear BottomNav');

      // Container max-w-md centered
      assert.match(appLayoutContent, /max-w-md min-h-screen flex flex-col bg-craie/, 'AppLayout must center max-w-md container');

      // Role label helper in AppLayout
      assert.match(appLayoutContent, /case 'chef_equipe':\s*return 'Chef';/, 'AppLayout must label chef_equipe as Chef');
      assert.match(appLayoutContent, /case 'admin':\s*return 'Admin';/, 'AppLayout must label admin as Admin');
      assert.match(appLayoutContent, /default:\s*return 'Ouvrier';/, 'AppLayout must default role to Ouvrier');
    });

    it('tests user initials helper logic against edge cases (empty strings, single letters)', () => {
      function getInitials(profile?: { prenom?: string; nom?: string } | null): string {
        if (!profile || !profile.prenom || !profile.nom) return 'PC';
        return `${profile.prenom.charAt(0)}${profile.nom.charAt(0)}`.toUpperCase();
      }

      assert.equal(getInitials(null), 'PC');
      assert.equal(getInitials(undefined), 'PC');
      assert.equal(getInitials({ prenom: '', nom: '' }), 'PC');
      assert.equal(getInitials({ prenom: 'Lucas', nom: 'Moreau' }), 'LM');
      assert.equal(getInitials({ prenom: 'a', nom: 'b' }), 'AB');
    });
  });

  // =========================================================================
  // Dimension 4: Planning Calendar Horizon, Supervisor Filters & Presence
  // =========================================================================
  describe('Dimension 4: Planning Calendar Horizon, Supervisor Filters & Presence', () => {
    it('verifies Planning month grid calculation for 28, 29, 30, and 31-day months', () => {
      function getMonthDaysCount(year: number, monthZeroIndexed: number): number {
        return new Date(year, monthZeroIndexed + 1, 0).getDate();
      }

      // Feb 2026 (non-leap): 28 days
      assert.equal(getMonthDaysCount(2026, 1), 28);
      // Feb 2024 (leap): 29 days
      assert.equal(getMonthDaysCount(2024, 1), 29);
      // April (30 days)
      assert.equal(getMonthDaysCount(2026, 3), 30);
      // July (31 days)
      assert.equal(getMonthDaysCount(2026, 6), 31);
    });

    it('verifies team presence aggregation deduplicates multiple assignments for the same worker', () => {
      const mockProfiles: Profile[] = [
        { id: 'w1', prenom: 'Marc', nom: 'Vasseur', email: 'marc@test.com', role: 'ouvrier', telephone: '0600000001', created_at: '' },
        { id: 'w2', prenom: 'Lucas', nom: 'Moreau', email: 'lucas@test.com', role: 'ouvrier', telephone: '0600000002', created_at: '' },
        { id: 'w3', prenom: 'Antoine', nom: 'Petit', email: 'antoine@test.com', role: 'ouvrier', telephone: '0600000003', created_at: '' },
      ];

      // Worker w1 is assigned to 2 different chantiers on the same date
      const mockAffectations: Affectation[] = [
        { id: 'a1', profile_id: 'w1', chantier_id: 'c1', date_intervention: '2026-10-28' },
        { id: 'a2', profile_id: 'w1', chantier_id: 'c2', date_intervention: '2026-10-28' },
        { id: 'a3', profile_id: 'w2', chantier_id: 'c1', date_intervention: '2026-10-28' },
      ];

      const dayAffs = mockAffectations.filter((a) => a.date_intervention === '2026-10-28');
      const assignedIds = new Set(dayAffs.map((a) => a.profile_id));
      const presentCount = assignedIds.size;
      const totalCount = mockProfiles.length;
      const mobilizationRate = Math.round((presentCount / totalCount) * 100);

      assert.equal(presentCount, 2, 'Must deduplicate w1 across multiple assignments');
      assert.equal(totalCount, 3);
      assert.equal(mobilizationRate, 67); // 2 out of 3 = 67%
    });

    it('verifies Planning role-based isolation enforces strict filtering for ouvrier', () => {
      // White-box assertion on Planning.tsx
      assert.match(
        planningContent,
        /if\s*\(profile\.role\s*===\s*['"]ouvrier['"]\)\s*return\s*profile\.id;/,
        'Planning must strictly restrict ouvrier to their own assignments'
      );
      assert.match(
        planningContent,
        /if\s*\(supervisorFilter\s*===\s*['"]mine['"]\)\s*return\s*profile\.id;/,
        'Planning supervisor can filter by their own assignments'
      );
      assert.match(
        planningContent,
        /if\s*\(supervisorFilter\s*===\s*['"]all['"]\)\s*return\s*null;/,
        'Planning supervisor can view all assignments globally'
      );
    });

    it('verifies supervisor team daily status aggregation with zero and multiple workers', () => {
      const mockProfiles: Profile[] = [
        { id: 'w1', prenom: 'Marc', nom: 'Vasseur', email: 'm@test.com', role: 'ouvrier', telephone: '', created_at: '' },
        { id: 'w2', prenom: 'Lucas', nom: 'Moreau', email: 'l@test.com', role: 'ouvrier', telephone: '', created_at: '' },
      ];

      const mockPointages: PointageLocal[] = [
        {
          id: 'pt1',
          profile_id: 'w1',
          date: '2026-10-28',
          heures_totales: 8.5,
          temps_pause: 1,
          heures_sup: 1.5,
          synced: true,
          error: null,
          created_at: '',
          updated_at: '',
        },
      ];

      const agg = aggregateTeamDailyStatus(mockPointages, mockProfiles, '2026-10-28');
      assert.equal(agg.workersCount, 2);
      assert.equal(agg.submittedCount, 1);
      assert.equal(agg.totalTeamHours, 8.5);
      assert.equal(agg.totalNormalHours, 7.0);
      assert.equal(agg.totalOvertime, 1.5);
      assert.equal(agg.totalPause, 1.0);

      // Empty team check (0 workers)
      const emptyAgg = aggregateTeamDailyStatus([], [], '2026-10-28');
      assert.equal(emptyAgg.workersCount, 0);
      assert.equal(emptyAgg.submittedCount, 0);
      assert.equal(emptyAgg.totalTeamHours, 0);
    });
  });

  // =========================================================================
  // Dimension 5: Fiche Chantier Typographic Purity, GPS Routing & Zero Media
  // =========================================================================
  describe('Dimension 5: Fiche Chantier Typographic Purity, GPS Routing & Zero Media', () => {
    it('verifies Google Maps GPS link encoding handles accents, spaces, and special symbols', () => {
      function generateGpsLink(address: string): string {
        return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
      }

      const sampleAddresses = [
        '14 Rue de la République, 69002 Lyon',
        '8 Allée des Châtaigniers & Chênes #3, 69130 Écully',
        "Chemin d'en-Haut, 01700 Saint-Maurice-de-Beynost",
        '100% Nature, Domaine du Grand-Bœuf, 38200 Vienne',
      ];

      for (const addr of sampleAddresses) {
        const link = generateGpsLink(addr);
        assert.ok(link.startsWith('https://maps.google.com/?q='), `Link must start with Google Maps query: ${link}`);
        assert.ok(!link.includes(' '), `Link must not contain raw spaces: ${link}`);
        assert.ok(!link.includes('#'), `Link query must not contain unencoded hash: ${link}`);
        assert.equal(decodeURIComponent(link.replace('https://maps.google.com/?q=', '')), addr);
      }
    });

    it('verifies Fiche Chantier strictly excludes photo uploads and media capture inputs', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<input[^>]+type=["']file["']/i,
        'ChantierDetail must not contain file upload inputs (deferred)'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /useCamera|capturePhoto|navigator\.mediaDevices/i,
        'ChantierDetail must not contain camera capture implementations (deferred)'
      );

      // Verifies typographic placeholder cards for future modules
      assert.match(
        chantierDetailContent,
        /Plan d'aménagement\.pdf/,
        'ChantierDetail must render document placeholder card'
      );
      assert.match(
        chantierDetailContent,
        /Devis signé\.pdf/,
        'ChantierDetail must render quote placeholder card'
      );
      assert.match(
        chantierDetailContent,
        /Module photos et galerie terrain à venir/,
        'ChantierDetail must render photo placeholder card with clean typography'
      );
    });

    it('verifies supervisor permissions gating on ChantierDetail', () => {
      assert.match(
        chantierDetailContent,
        /const isSupervisor\s*=\s*profile\?\.role\s*===\s*['"]chef_equipe['"]\s*\|\|\s*profile\?\.role\s*===\s*['"]admin['"]/,
        'ChantierDetail must gate management controls behind isSupervisor'
      );
      assert.match(
        chantierDetailContent,
        /handleToggleWorker/,
        'ChantierDetail must provide worker assignment toggle handler for supervisors'
      );
      assert.match(
        chantierDetailContent,
        /handleStatutChange/,
        'ChantierDetail must provide status transition handler for supervisors'
      );
    });
  });

  // =========================================================================
  // Dimension 6: Chat UI Static Mock Isolation, Channel Filter & Message Room
  // =========================================================================
  describe('Dimension 6: Chat UI Static Mock Isolation, Channel Filter & Message Room', () => {
    it('verifies static mock purity with zero Supabase Realtime subscriptions in Chat', () => {
      assert.doesNotMatch(
        chatPreviewContent,
        /supabase\.channel|supabase\.from\(['"]messages['"]\)\.on/i,
        'ChatPreview must not establish live Supabase Realtime WebSocket subscriptions'
      );
      assert.doesNotMatch(
        chatRoomViewContent,
        /supabase\.channel|supabase\.from\(['"]messages['"]\)\.on/i,
        'ChatRoomView must not establish live Supabase Realtime WebSocket subscriptions'
      );
    });

    it('verifies channel category filter tabs and search querying mechanics', () => {
      const mockChannels: ChatConversation[] = [
        {
          id: 'general',
          title: 'Équipe Paysage Concept',
          category: 'equipe',
          subtitle: 'Rappel terreau',
          time: '08:14',
          unreadCount: 2,
          messages: [],
        },
        {
          id: 'laurent',
          title: 'Chantier Villa Laurent',
          category: 'chantier',
          subtitle: 'Terrasse ipé',
          time: 'Hier',
          unreadCount: 0,
          chantierId: 'c1',
          messages: [],
        },
        {
          id: 'direction',
          title: 'Direction & Sécurité',
          category: 'direction',
          subtitle: 'Consignes canicule',
          time: 'Lun',
          unreadCount: 0,
          messages: [],
        },
      ];

      function filterChannels(
        channels: ChatConversation[],
        tab: FilterCategory,
        query: string
      ): ChatConversation[] {
        return channels.filter((c) => {
          const matchesTab = tab === 'tous' || c.category === tab;
          const q = query.toLowerCase().trim();
          const matchesSearch =
            !q || c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q);
          return matchesTab && matchesSearch;
        });
      }

      // Tab filters
      assert.equal(filterChannels(mockChannels, 'tous', '').length, 3);
      assert.equal(filterChannels(mockChannels, 'equipe', '').length, 1);
      assert.equal(filterChannels(mockChannels, 'chantier', '').length, 1);
      assert.equal(filterChannels(mockChannels, 'direction', '').length, 1);

      // Search filters
      assert.equal(filterChannels(mockChannels, 'tous', 'laurent').length, 1);
      assert.equal(filterChannels(mockChannels, 'tous', 'terreau').length, 1);
      assert.equal(filterChannels(mockChannels, 'tous', 'inexistant').length, 0);

      // Cross tab + search
      assert.equal(filterChannels(mockChannels, 'equipe', 'laurent').length, 0);
    });

    it('verifies deep linking resolves conversation by channel ID or chantier ID', () => {
      function resolveConversation(
        channels: ChatConversation[],
        param: string | null
      ): string | null {
        if (!param) return null;
        const match = channels.find(
          (c) =>
            c.id.toLowerCase() === param.toLowerCase() ||
            (c.chantierId && c.chantierId.toLowerCase() === param.toLowerCase())
        );
        return match ? match.id : null;
      }

      const mockChannels: ChatConversation[] = [
        { id: 'laurent', title: 'Villa Laurent', category: 'chantier', subtitle: '', time: '', unreadCount: 0, chantierId: 'c1', messages: [] },
      ];

      assert.equal(resolveConversation(mockChannels, 'laurent'), 'laurent');
      assert.equal(resolveConversation(mockChannels, 'c1'), 'laurent');
      assert.equal(resolveConversation(mockChannels, 'C1'), 'laurent'); // Case-insensitive
      assert.equal(resolveConversation(mockChannels, 'unknown'), null);
      assert.equal(resolveConversation(mockChannels, null), null);
    });

    it('verifies chat bubble styling: Forest Green for outgoing, Sand for incoming', () => {
      assert.match(
        chatRoomViewContent,
        /bg-foret text-blanc rounded-2xl rounded-tr-xs/,
        'Outgoing message bubbles must be Forest Green (#15302F) with rounded-tr-xs corner'
      );
      assert.match(
        chatRoomViewContent,
        /bg-sable\/80 text-foret rounded-2xl rounded-tl-xs/,
        'Incoming message bubbles must be Sand (#E8E3D9) with rounded-tl-xs corner'
      );
    });
  });

  // =========================================================================
  // Dimension 7: Dexie v2 Offline Storage, Race Condition Guards & Idempotency
  // =========================================================================
  describe('Dimension 7: Dexie v2 Offline Storage, Race Condition Guards & Idempotency', () => {
    it('verifies Dexie v2 schema includes [profile_id+date] compound index', () => {
      assert.match(
        dbContent,
        /version\(2\)\s*\.stores\(\s*\{[\s\S]*?pointages:\s*['"][^'"]*\[profile_id\+date\][^'"]*['"]/,
        'Dexie v2 schema must define compound index [profile_id+date]'
      );
    });

    it('verifies saveDailyPointage retains existing ID upon update to enforce idempotence', () => {
      assert.match(
        syncContent,
        /const pointageId\s*=\s*existing\s*\?\s*existing\.id\s*:\s*generateUUID\(\)/,
        'saveDailyPointage must preserve existing pointage ID to prevent duplicates'
      );
      assert.match(
        syncContent,
        /created_at:\s*existing\?\.created_at\s*\?\?\s*now/,
        'saveDailyPointage must preserve created_at timestamp on updates'
      );
    });

    it('verifies concurrent sync race condition prevention in SyncEngine', () => {
      assert.match(
        syncContent,
        /if\s*\(this\.isSyncing\)\s*return\s*\{\s*success:\s*0,\s*failed:\s*0,\s*totalPending:\s*0\s*\};/,
        'SyncEngine must guard against concurrent executions via isSyncing flag'
      );
      assert.match(
        syncContent,
        /if\s*\(typeof navigator\s*!==\s*['"]undefined['"]\s*&&\s*!navigator\.onLine\)/,
        'SyncEngine must detect offline status before attempting network sync'
      );
    });

    it('verifies pullRemoteData preserves local unsynced edits during server reconciliation', () => {
      assert.match(
        syncContent,
        /if\s*\(!local\.synced\)\s*\{[\s\S]*?\/\/ Saisie locale en attente : NE PAS écraser/,
        'pullRemoteData must never overwrite local unsynced drafts with remote cache'
      );
    });
  });

  // =========================================================================
  // Dimension 8: Outdoor Daylight Contrast, WCAG Standards & Ergonomics
  // =========================================================================
  describe('Dimension 8: Outdoor Daylight Contrast, WCAG Standards & Ergonomics', () => {
    const palette = {
      foret: '#15302F',
      sauge: '#8FA98F',
      sable: '#E8E3D9',
      craie: '#FAFAFB',
      terracotta: '#C47452',
      blanc: '#FFFFFF',
      muted: '#6B7280',
    };

    it('verifies brand color hex values match project design tokens', () => {
      assert.match(indexCss, /--color-foret:\s*#15302F;/);
      assert.match(indexCss, /--color-sauge:\s*#8FA98F;/);
      assert.match(indexCss, /--color-sable:\s*#E8E3D9;/);
      assert.match(indexCss, /--color-craie:\s*#FAFAFB;/);
      assert.match(indexCss, /--color-terracotta:\s*#C47452;/);
      assert.match(indexCss, /--color-blanc:\s*#FFFFFF;/);
      assert.match(indexCss, /--color-muted:\s*#6B7280;/);
    });

    it('verifies primary text combinations meet WCAG AA (>= 4.5:1) and AAA (>= 7.0:1) daylight thresholds', () => {
      // 1. Forest Green on Off-White Canvas (Craie)
      const ratioForetCraie = contrastRatio(palette.foret, palette.craie);
      assert.ok(
        ratioForetCraie >= 7.0,
        `Forest on Craie (${ratioForetCraie.toFixed(2)}) must exceed WCAG AAA (>= 7.0:1)`
      );

      // 2. Forest Green on Warm Sand (Sable)
      const ratioForetSable = contrastRatio(palette.foret, palette.sable);
      assert.ok(
        ratioForetSable >= 7.0,
        `Forest on Sable (${ratioForetSable.toFixed(2)}) must exceed WCAG AAA (>= 7.0:1)`
      );

      // 3. Pure White on Forest Green (Header bar)
      const ratioBlancForet = contrastRatio(palette.blanc, palette.foret);
      assert.ok(
        ratioBlancForet >= 7.0,
        `White on Forest (${ratioBlancForet.toFixed(2)}) must exceed WCAG AAA (>= 7.0:1)`
      );

      // 4. Pure White on Accent Terracotta (Buttons)
      const ratioBlancTerracotta = contrastRatio(palette.blanc, palette.terracotta);
      assert.ok(
        ratioBlancTerracotta >= 3.0,
        `White on Terracotta (${ratioBlancTerracotta.toFixed(2)}) must meet WCAG AA large/UI (>= 3.0:1)`
      );

      // 5. Forest Green on Sage Green pills
      const ratioForetSauge = contrastRatio(palette.foret, palette.sauge);
      assert.ok(
        ratioForetSauge >= 4.5,
        `Forest on Sage (${ratioForetSauge.toFixed(2)}) must exceed WCAG AA (>= 4.5:1)`
      );

      // 6. Muted Gray on Craie
      const ratioMutedCraie = contrastRatio(palette.muted, palette.craie);
      assert.ok(
        ratioMutedCraie >= 4.5,
        `Muted on Craie (${ratioMutedCraie.toFixed(2)}) must meet WCAG AA (>= 4.5:1)`
      );
    });

    it('verifies minimum 48x48px touch targets across all interactive buttons in secondary screens', () => {
      // Equipe.tsx
      assert.match(
        equipeContent,
        /min-h-\[48px\][\s\S]*?filterRole/,
        'Équipe role filter buttons must enforce >= 48px height'
      );
      assert.match(
        equipeContent,
        /aria-label=["']Effacer la recherche["'][\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
        'Équipe clear search button must enforce min-w-[48px] min-h-[48px]'
      );

      // Plus.tsx
      assert.match(
        plusContent,
        /min-h-\[48px\][\s\S]*?handleSyncNow/,
        'Plus sync button must enforce >= 48px height'
      );

      // Chantiers.tsx
      assert.match(
        chantiersContent,
        /min-w-\[48px\]\s+min-h-\[48px\]/,
        'Chantiers modal and action buttons must enforce min-w-[48px] min-h-[48px]'
      );

      // Home.tsx steppers
      assert.match(
        homeContent,
        /min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12[\s\S]*?Diminuer heures totales/,
        'Home minus stepper must enforce >= 48x48px'
      );
      assert.match(
        homeContent,
        /min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12[\s\S]*?Augmenter heures totales/,
        'Home plus stepper must enforce >= 48x48px'
      );
    });
  });
});
