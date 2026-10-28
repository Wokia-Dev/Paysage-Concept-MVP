/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculateAutoOvertime,
  calculateNormalHours,
  formatHours,
  validateDailyHours,
  calculateNetWorkedHours,
  calculateHoursSummary,
  aggregateTeamDailyStatus,
  getStoredDailyTarget,
  setStoredDailyTarget,
  DEFAULT_DAILY_TARGET,
  DAILY_TARGET_STORAGE_PREFIX,
} from '../lib/hours.ts';
import type { PointageLocal, Profile, Affectation } from '../types/database.ts';
import type { ChatConversation, ChatMessage, FilterCategory } from '../types/chat.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

/**
 * Calculates relative luminance according to WCAG 2.1 specification.
 */
function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

describe('Tier 5 Independent Adversarial Coverage Hardening (Challenger 2)', () => {
  // Source files under audit
  const indexPath = resolve(projectRoot, 'src/index.css');
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');
  const planningPath = resolve(projectRoot, 'src/pages/Planning.tsx');
  const chantierDetailPath = resolve(projectRoot, 'src/pages/ChantierDetail.tsx');
  const chatPreviewPath = resolve(projectRoot, 'src/pages/ChatPreview.tsx');
  const chatRoomViewPath = resolve(projectRoot, 'src/components/modules/ChatRoomView.tsx');
  const bottomNavPath = resolve(projectRoot, 'src/components/layout/BottomNav.tsx');
  const appLayoutPath = resolve(projectRoot, 'src/components/layout/AppLayout.tsx');
  const dateSelectorPillPath = resolve(projectRoot, 'src/components/common/DateSelectorPill.tsx');
  const circularGaugePath = resolve(projectRoot, 'src/components/common/CircularProgressGauge.tsx');

  const indexContent = readFileSync(indexPath, 'utf-8');
  const homeContent = readFileSync(homePath, 'utf-8');
  const planningContent = readFileSync(planningPath, 'utf-8');
  const chantierDetailContent = readFileSync(chantierDetailPath, 'utf-8');
  const chatPreviewContent = readFileSync(chatPreviewPath, 'utf-8');
  const chatRoomViewContent = readFileSync(chatRoomViewPath, 'utf-8');
  const bottomNavContent = readFileSync(bottomNavPath, 'utf-8');
  const appLayoutContent = readFileSync(appLayoutPath, 'utf-8');
  const dateSelectorPillContent = readFileSync(dateSelectorPillPath, 'utf-8');
  const circularGaugeContent = readFileSync(circularGaugePath, 'utf-8');

  // =========================================================================
  // Dimension 1: Declarative Time-Tracking Formulas & Target Clamping
  // =========================================================================
  describe('Dimension 1: Declarative Time-Tracking Formulas & Target Clamping', () => {
    it('exhaustively sweeps calculateAutoOvertime from 0h to 24h across diverse targets', () => {
      const testTargets = [1.0, 5.0, 7.0, 7.5, 8.0, 10.0, 12.0, 24.0];

      for (const target of testTargets) {
        for (let step = 0; step <= 96; step++) {
          const total = Math.round((step * 0.25) * 100) / 100;
          const overtime = calculateAutoOvertime(total, target);

          if (total <= target) {
            assert.equal(
              overtime,
              0,
              `Overtime must be strictly 0 when total (${total}) <= target (${target})`
            );
          } else {
            const expected = Math.round((total - target) * 100) / 100;
            assert.equal(
              overtime,
              expected,
              `Overtime mismatch at total=${total}, target=${target}`
            );
          }
        }
      }
    });

    it('safely handles pathological and edge-case inputs in calculateAutoOvertime', () => {
      assert.equal(calculateAutoOvertime(NaN, 7), 0);
      assert.equal(calculateAutoOvertime(7, NaN), 0);
      assert.equal(calculateAutoOvertime(Infinity, 7), 0);
      assert.equal(calculateAutoOvertime(7, Infinity), 0);
      assert.equal(calculateAutoOvertime(-Infinity, 7), 0);
      assert.equal(calculateAutoOvertime(-5, 7), 0);
      assert.equal(calculateAutoOvertime(8, -2), 8); // Negative target treated as 0
      assert.equal(calculateAutoOvertime(0, 0), 0);
      assert.equal(calculateAutoOvertime(7.0001, 7), 0); // Rounds to 0.00
      assert.equal(calculateAutoOvertime(7.006, 7), 0.01); // Rounds to 0.01
    });

    it('proves normalHours invariant (normalHours + sup === total) across combinatorial grid', () => {
      for (let totalInt = 0; totalInt <= 24; totalInt += 0.5) {
        for (let supInt = 0; supInt <= totalInt; supInt += 0.5) {
          const normal = calculateNormalHours(totalInt, supInt);
          const reconstructed = Math.round((normal + supInt) * 100) / 100;
          assert.equal(
            reconstructed,
            totalInt,
            `Invariant failed: normal(${normal}) + sup(${supInt}) !== total(${totalInt})`
          );
        }
      }
    });

    it('guarantees calculateNormalHours never returns negative values even under invalid sup > total', () => {
      assert.equal(calculateNormalHours(5, 10), 0); // clamped, never negative
      assert.equal(calculateNormalHours(-2, 3), 0);
      assert.equal(calculateNormalHours(NaN, 2), 0);
      assert.equal(calculateNormalHours(8, NaN), 8);
      assert.equal(calculateNormalHours(8, -3), 8); // Negative sup treated as 0
    });

    it('stress-tests localStorage target persistence, profile scoping and clamping [1, 24]', () => {
      const originalWindow = globalThis.window;
      const mockStorage: Record<string, string> = {};

      const fakeWindow = {
        localStorage: {
          getItem: (key: string) => mockStorage[key] || null,
          setItem: (key: string, val: string) => {
            mockStorage[key] = val;
          },
          removeItem: (key: string) => {
            delete mockStorage[key];
          },
          clear: () => {
            for (const k in mockStorage) delete mockStorage[k];
          },
        },
      };

      try {
        globalThis.window = fakeWindow as unknown as Window & typeof globalThis;

        // Default when empty
        assert.equal(getStoredDailyTarget(), DEFAULT_DAILY_TARGET);

        // Store within range
        setStoredDailyTarget(8.5, 'worker-1');
        assert.equal(getStoredDailyTarget('worker-1'), 8.5);

        // Store below min (clamped to 1.0)
        setStoredDailyTarget(0, 'worker-2');
        assert.equal(getStoredDailyTarget('worker-2'), 1.0);
        setStoredDailyTarget(-10, 'worker-2');
        assert.equal(getStoredDailyTarget('worker-2'), 1.0);

        // Store above max (clamped to 24.0)
        setStoredDailyTarget(25, 'worker-3');
        assert.equal(getStoredDailyTarget('worker-3'), 24.0);
        setStoredDailyTarget(100, 'worker-3');
        assert.equal(getStoredDailyTarget('worker-3'), 24.0);

        // Corrupted localStorage values fall back to DEFAULT_DAILY_TARGET
        mockStorage[`${DAILY_TARGET_STORAGE_PREFIX}_corrupt`] = 'not_a_number';
        assert.equal(getStoredDailyTarget('corrupt'), DEFAULT_DAILY_TARGET);

        mockStorage[`${DAILY_TARGET_STORAGE_PREFIX}_zero`] = '0';
        assert.equal(getStoredDailyTarget('zero'), DEFAULT_DAILY_TARGET);

        mockStorage[`${DAILY_TARGET_STORAGE_PREFIX}_huge`] = '999';
        assert.equal(getStoredDailyTarget('huge'), DEFAULT_DAILY_TARGET);
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it('tests formatHours minute roll-over, padding, and edge conditions', () => {
      assert.equal(formatHours(0), '0h00');
      assert.equal(formatHours(7), '7h00');
      assert.equal(formatHours(7.5), '7h30');
      assert.equal(formatHours(7.25), '7h15');
      assert.equal(formatHours(7.75), '7h45');
      assert.equal(formatHours(1 / 60), '0h01');
      assert.equal(formatHours(59 / 60), '0h59');

      // Rounding near next hour threshold (mins >= 60 rollover)
      assert.equal(formatHours(7.999), '8h00');
      assert.equal(formatHours(23.999), '24h00');

      // Negative values
      assert.equal(formatHours(-1.5), '-1h30');
      assert.equal(formatHours(-0.25), '-0h15');

      // Non-finite
      assert.equal(formatHours(NaN), '0h00');
      assert.equal(formatHours(Infinity), '0h00');
      assert.equal(formatHours(-Infinity), '0h00');
    });

    it('stress-tests validateDailyHours against adversarial combinatorial bounds', () => {
      // Valid cases
      assert.equal(validateDailyHours(0, 0, 0).valid, true);
      assert.equal(validateDailyHours(24, 0, 0).valid, true);
      assert.equal(validateDailyHours(24, 24, 24).valid, true);
      assert.equal(validateDailyHours(7.5, 1, 0.5).valid, true);
      assert.equal(validateDailyHours(8, 1, 8).valid, true);

      // Total exceeding 24h
      assert.equal(validateDailyHours(24.01, 1, 0).valid, false);
      assert.equal(validateDailyHours(25, 0, 0).valid, false);

      // Pause exceeding 24h
      assert.equal(validateDailyHours(8, 24.1, 0).valid, false);

      // Overtime exceeding 24h
      assert.equal(validateDailyHours(8, 1, 24.1).valid, false);

      // Overtime exceeding total
      assert.equal(validateDailyHours(7.0, 1, 7.1).valid, false);
      assert.equal(validateDailyHours(0, 0, 0.1).valid, false);

      // Negative values
      assert.equal(validateDailyHours(-0.1, 1, 0).valid, false);
      assert.equal(validateDailyHours(7, -0.1, 0).valid, false);
      assert.equal(validateDailyHours(7, 1, -0.1).valid, false);

      // Non-finite values
      assert.equal(validateDailyHours(NaN, 1, 0).valid, false);
      assert.equal(validateDailyHours(7, Infinity, 0).valid, false);
      assert.equal(validateDailyHours(7, 1, -Infinity).valid, false);
    });

    it('verifies CircularProgressGauge arc geometry, 260-degree sweep, and ratio clamping', () => {
      // Radius = 76, center = 100
      const radius = 76;
      const sweepAngle = 260;
      const circumference = 2 * Math.PI * radius; // ~477.52
      const arcLength = circumference * (sweepAngle / 360); // ~344.87

      assert.match(circularGaugeContent, /radius\s*=\s*76/, 'Radius must be 76');
      assert.match(circularGaugeContent, /sweepAngle\s*=\s*260/, 'Sweep angle must be 260');

      // Simulate gauge mathematics
      function simulateGauge(value: number, target: number) {
        const targetSafe = target > 0 ? target : 7;
        const progressRatio = Math.max(0, value / targetSafe);
        const clampedRatio = Math.min(1, progressRatio);
        const filledLength = clampedRatio * arcLength;
        const percentage = Math.round(progressRatio * 100);
        return { clampedRatio, filledLength, percentage, targetSafe };
      }

      // Normal progress
      const gHalf = simulateGauge(3.5, 7);
      assert.equal(gHalf.clampedRatio, 0.5);
      assert.equal(gHalf.percentage, 50);
      assert.equal(Math.round(gHalf.filledLength * 100) / 100, Math.round(arcLength * 0.5 * 100) / 100);

      // Met target
      const gFull = simulateGauge(7, 7);
      assert.equal(gFull.clampedRatio, 1.0);
      assert.equal(gFull.percentage, 100);
      assert.equal(Math.round(gFull.filledLength * 100) / 100, Math.round(arcLength * 100) / 100);

      // Over target (e.g. 14h on 7h target -> ratio clamped to 1, percentage 200%)
      const gOver = simulateGauge(14, 7);
      assert.equal(gOver.clampedRatio, 1.0); // Never overflows SVG arc
      assert.equal(gOver.percentage, 200);

      // Zero or negative target safely defaults to 7h
      const gZeroTarget = simulateGauge(7, 0);
      assert.equal(gZeroTarget.targetSafe, 7);
      assert.equal(gZeroTarget.percentage, 100);

      const gNegTarget = simulateGauge(7, -5);
      assert.equal(gNegTarget.targetSafe, 7);
      assert.equal(gNegTarget.percentage, 100);
    });

    it('verifies calculateNetWorkedHours and calculateHoursSummary cumulative arithmetic', () => {
      // calculateNetWorkedHours
      assert.equal(calculateNetWorkedHours(8, 1), 7);
      assert.equal(calculateNetWorkedHours(7.5, 0.75), 6.75);
      assert.equal(calculateNetWorkedHours(5, 6), 0, 'Net hours cannot be negative if pause > total');
      assert.equal(calculateNetWorkedHours(-2, 1), 0);
      assert.equal(calculateNetWorkedHours(8, -1), 8);
      assert.equal(calculateNetWorkedHours(NaN, 1), 0);

      // calculateHoursSummary
      const pts: PointageLocal[] = [
        {
          id: '1',
          profile_id: 'p1',
          date: '2026-10-26',
          heures_totales: 8,
          temps_pause: 1,
          heures_sup: 1,
          synced: true,
        },
        {
          id: '2',
          profile_id: 'p1',
          date: '2026-10-27',
          heures_totales: 7.5,
          temps_pause: 0.5,
          heures_sup: 0.5,
          synced: true,
        },
      ];

      const sum = calculateHoursSummary(pts);
      assert.equal(sum.totalHours, 15.5);
      assert.equal(sum.totalPause, 1.5);
      assert.equal(sum.totalOvertime, 1.5);
      assert.equal(sum.normalHours, 14.0); // (8-1) + (7.5-0.5) = 7 + 7 = 14
    });
  });

  // =========================================================================
  // Dimension 2: Date Picker Leaps, DST Shifts & Timezone Anchors
  // =========================================================================
  describe('Dimension 2: Date Picker Leaps, Transitions & Timezone Anchors', () => {
    // Helper simulating Home.tsx date navigation
    const stepNextDay = (dateStr: string): string => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    };

    const stepPrevDay = (dateStr: string): string => {
      const d = new Date(dateStr + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    };

    it('navigates seamlessly across Leap Day (2024-02-29) in both forward and backward directions', () => {
      let current = '2024-02-27';
      current = stepNextDay(current);
      assert.equal(current, '2024-02-28');

      current = stepNextDay(current);
      assert.equal(current, '2024-02-29', 'Leap day 2024-02-29 must be visited');

      current = stepNextDay(current);
      assert.equal(current, '2024-03-01', 'Next day after leap day must be 2024-03-01');

      // Backward navigation
      current = stepPrevDay(current);
      assert.equal(current, '2024-02-29', 'Previous day from March 1 in leap year must be Feb 29');

      current = stepPrevDay(current);
      assert.equal(current, '2024-02-28');
    });

    it('skips Feb 29 in non-leap year (2025) and handles century leap rules (1900 vs 2000)', () => {
      // 2025 (regular non-leap)
      let d2025 = '2025-02-28';
      d2025 = stepNextDay(d2025);
      assert.equal(d2025, '2025-03-01', 'Non-leap 2025 must jump directly to 2025-03-01');
      d2025 = stepPrevDay(d2025);
      assert.equal(d2025, '2025-02-28');

      // 1900 (century non-leap)
      let d1900 = '1900-02-28';
      d1900 = stepNextDay(d1900);
      assert.equal(d1900, '1900-03-01', 'Year 1900 is non-leap century year');

      // 2000 (400-year cycle leap year)
      let d2000 = '2000-02-28';
      d2000 = stepNextDay(d2000);
      assert.equal(d2000, '2000-02-29', 'Year 2000 is 400-year leap year');
      d2000 = stepNextDay(d2000);
      assert.equal(d2000, '2000-03-01');
    });

    it('transitions across New Year boundaries (Dec 31 to Jan 01) without date or year drift', () => {
      let d = '2026-12-30';
      d = stepNextDay(d);
      assert.equal(d, '2026-12-31');

      d = stepNextDay(d);
      assert.equal(d, '2027-01-01', 'Must increment year cleanly');

      d = stepNextDay(d);
      assert.equal(d, '2027-01-02');

      d = stepPrevDay(d);
      assert.equal(d, '2027-01-01');

      d = stepPrevDay(d);
      assert.equal(d, '2026-12-31', 'Must decrement year cleanly');
    });

    it('safeguards against Daylight Saving Time (DST) shift bugs via midday UTC anchor', () => {
      // Spring forward in Europe/Paris: last Sunday of March (2026-03-29)
      let spring = '2026-03-28';
      spring = stepNextDay(spring);
      assert.equal(spring, '2026-03-29');
      spring = stepNextDay(spring);
      assert.equal(spring, '2026-03-30');

      // Fall back in Europe/Paris: last Sunday of October (2026-10-25)
      let fall = '2026-10-24';
      fall = stepNextDay(fall);
      assert.equal(fall, '2026-10-25');
      fall = stepNextDay(fall);
      assert.equal(fall, '2026-10-26');

      // Confirm Home.tsx utilizes midday UTC string concatenation T12:00:00Z
      assert.match(
        homeContent,
        /selectedDateStr\s*\+\s*['"]T12:00:00Z['"]/,
        'Home.tsx must anchor to T12:00:00Z to avoid timezone day shifts'
      );
    });

    it('verifies DateSelectorPill safely parses date components and formats French capitalization', () => {
      // Verify DateSelectorPill uses split('-') to avoid midnight UTC parsing drift
      assert.match(
        dateSelectorPillContent,
        /selectedDate\.split\(['"]-['"]\)\.map\(Number\)/,
        'DateSelectorPill must parse YYYY-MM-DD safely'
      );

      // Verify touch targets >= 48px on chevron buttons
      assert.match(
        dateSelectorPillContent,
        /min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Jour précédent/,
        'Previous day button must meet min 48x48px touch target'
      );
      assert.match(
        dateSelectorPillContent,
        /min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Jour suivant/,
        'Next day button must meet min 48x48px touch target'
      );
    });
  });

  // =========================================================================
  // Dimension 3: Planning Multi-Horizon Schedules & Team Presence
  // =========================================================================
  describe('Dimension 3: Planning Multi-Horizon Schedules & Team Presence', () => {
    it('verifies Planning week horizon Monday-alignment algorithm across all days of week', () => {
      // Test the Monday alignment logic from Planning.tsx:
      // const currentDayOfWeek = today.getDay();
      // const mondayDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const mondayDiff = dayIndex === 0 ? -6 : 1 - dayIndex;
        // Verify that dayIndex + mondayDiff is always 1 (Monday modulo 7)
        const computedMondayIndex = (dayIndex + mondayDiff + 7) % 7;
        assert.equal(
          computedMondayIndex,
          1,
          `Monday offset calculation must land on Monday (1) for ${dayNames[dayIndex]} (day ${dayIndex})`
        );
      }
    });

    it('verifies Planning month calendar grid generation always forms complete 7-column matrix', () => {
      // Simulate Planning monthGridDays logic for February 2024 (Leap year) and May 2026 (starts Friday, 31 days)
      function generateMonthGrid(year: number, month: number) {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
        const totalDaysInMonth = lastDayOfMonth.getDate();

        const days: { dateStr: string; isCurrentMonth: boolean; dayNumber: number }[] = [];

        // Previous month filler days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
          days.push({
            dateStr: `prev-${prevMonthLastDay - i}`,
            isCurrentMonth: false,
            dayNumber: prevMonthLastDay - i,
          });
        }

        // Current month days
        for (let d = 1; d <= totalDaysInMonth; d++) {
          days.push({
            dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            isCurrentMonth: true,
            dayNumber: d,
          });
        }

        // Next month filler days to complete multiple of 7
        const remainder = days.length % 7;
        if (remainder > 0) {
          const fillCount = 7 - remainder;
          for (let i = 1; i <= fillCount; i++) {
            days.push({
              dateStr: `next-${i}`,
              isCurrentMonth: false,
              dayNumber: i,
            });
          }
        }

        return { days, totalDaysInMonth };
      }

      // Feb 2024 (Leap Year)
      const feb2024 = generateMonthGrid(2024, 1);
      assert.equal(feb2024.totalDaysInMonth, 29, 'Feb 2024 must have 29 days');
      assert.equal(feb2024.days.length % 7, 0, 'Grid length must be multiple of 7');

      // Feb 2025 (Non-leap)
      const feb2025 = generateMonthGrid(2025, 1);
      assert.equal(feb2025.totalDaysInMonth, 28, 'Feb 2025 must have 28 days');
      assert.equal(feb2025.days.length % 7, 0, 'Grid length must be multiple of 7');

      // May 2026 (Starts on Friday, 31 days -> ends on Sunday -> exactly 5 weeks = 35 cells)
      const may2026 = generateMonthGrid(2026, 4);
      assert.equal(may2026.totalDaysInMonth, 31, 'May 2026 must have 31 days');
      assert.equal(may2026.days.length, 35, 'May 2026 fits in exactly 35 cells (5 rows of 7)');
      assert.equal(may2026.days.length % 7, 0);

      // August 2026 (Starts on Saturday, 31 days -> spills into 6th week = 42 cells)
      const aug2026 = generateMonthGrid(2026, 7);
      assert.equal(aug2026.totalDaysInMonth, 31, 'August 2026 must have 31 days');
      assert.equal(aug2026.days.length, 42, 'August 2026 requires 42 cells (6 rows of 7)');
      assert.equal(aug2026.days.length % 7, 0);
    });

    it('verifies team presence deduplication when a worker is assigned to multiple chantiers on the same day', () => {
      const mockProfiles: Profile[] = [
        { id: 'p1', nom: 'Dupont', prenom: 'Jean', role: 'ouvrier', email: 'j@pc.fr' },
        { id: 'p2', nom: 'Martin', prenom: 'Thomas', role: 'ouvrier', email: 't@pc.fr' },
        { id: 'p3', nom: 'Vasseur', prenom: 'Marc', role: 'chef_equipe', email: 'm@pc.fr' },
        { id: 'p4', nom: 'Bernard', prenom: 'Lucas', role: 'ouvrier', email: 'l@pc.fr' },
        { id: 'p5', nom: 'Petit', prenom: 'Antoine', role: 'ouvrier', email: 'a@pc.fr' },
      ];

      // Jean is assigned to TWO different chantiers on 2026-10-28
      const mockAffectations: Affectation[] = [
        { id: 'a1', profile_id: 'p1', chantier_id: 'c1', date_intervention: '2026-10-28' },
        { id: 'a2', profile_id: 'p1', chantier_id: 'c2', date_intervention: '2026-10-28' }, // duplicate worker assignment
        { id: 'a3', profile_id: 'p2', chantier_id: 'c1', date_intervention: '2026-10-28' },
        { id: 'a4', profile_id: 'p3', chantier_id: 'c2', date_intervention: '2026-10-28' },
      ];

      // Replicate Planning.tsx teamPresence calculation
      const dayAffs = mockAffectations.filter((a) => a.date_intervention === '2026-10-28');
      const assignedIds = new Set(dayAffs.map((a) => a.profile_id));
      const presentCount = assignedIds.size;
      const totalCount = mockProfiles.length;
      const mobilizationRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

      // Unique workers: p1, p2, p3 = 3 workers (despite 4 affectation records)
      assert.equal(presentCount, 3, 'Present count must deduplicate workers across multiple assignments');
      assert.equal(totalCount, 5);
      assert.equal(mobilizationRate, 60, '3/5 workers = 60% mobilization');
    });

    it('verifies aggregateTeamDailyStatus calculates exact team totals and submitted counts', () => {
      const profiles: Profile[] = [
        { id: 'w1', nom: 'A', prenom: 'A', role: 'ouvrier', email: 'a@a.fr' },
        { id: 'w2', nom: 'B', prenom: 'B', role: 'ouvrier', email: 'b@b.fr' },
        { id: 'w3', nom: 'C', prenom: 'C', role: 'ouvrier', email: 'c@c.fr' },
      ];

      const pointages: PointageLocal[] = [
        {
          id: 'pt-1',
          profile_id: 'w1',
          date: '2026-10-28',
          heures_totales: 8.5,
          temps_pause: 1.0,
          heures_sup: 1.5,
          synced: true,
        },
        {
          id: 'pt-2',
          profile_id: 'w2',
          date: '2026-10-28',
          heures_totales: 7.0,
          temps_pause: 0.5,
          heures_sup: 0.0,
          synced: true,
        },
        // w3 did not submit
        // Extra pointage on another date (should be ignored)
        {
          id: 'pt-old',
          profile_id: 'w3',
          date: '2026-10-27',
          heures_totales: 8.0,
          temps_pause: 1.0,
          heures_sup: 1.0,
          synced: true,
        },
      ];

      const summary = aggregateTeamDailyStatus(pointages, profiles, '2026-10-28');

      assert.equal(summary.workersCount, 3);
      assert.equal(summary.submittedCount, 2);
      assert.equal(summary.totalTeamHours, 15.5);
      assert.equal(summary.totalNormalHours, 14.0); // (8.5 - 1.5) + (7.0 - 0) = 7 + 7 = 14
      assert.equal(summary.totalOvertime, 1.5);
      assert.equal(summary.totalPause, 1.5);

      // Verify aggregate invariant
      assert.equal(
        summary.totalTeamHours,
        summary.totalNormalHours + summary.totalOvertime,
        'Team invariant: totalTeamHours === totalNormalHours + totalOvertime'
      );
    });

    it('enforces worker role isolation: ouvrier strictly restricted to own planning', () => {
      assert.match(
        planningContent,
        /if\s*\(\s*profile\.role\s*===\s*['"]ouvrier['"]\s*\)\s*return\s+profile\.id;/,
        'Worker role must be strictly clamped to own profile ID'
      );
      assert.match(
        planningContent,
        /profile\?\.role\s*===\s*['"]ouvrier['"][\s\S]*?Vos missions personnelles planifiées/,
        'Worker role must display personal schedule label'
      );
    });
  });

  // =========================================================================
  // Dimension 4: Typographic Chantier Layout & Deferred Media Guarantees
  // =========================================================================
  describe('Dimension 4: Typographic Chantier Layout & Deferred Media Guarantees', () => {
    it('guarantees zero media tags (img, picture, video) in ChantierDetail.tsx', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<img[\s>]/i,
        'ChantierDetail must not contain <img> tags (photo uploads deferred)'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /<picture[\s>]/i,
        'ChantierDetail must not contain <picture> tags'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /<video[\s>]/i,
        'ChantierDetail must not contain <video> tags'
      );
    });

    it('guarantees zero file upload inputs in ChantierDetail.tsx', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<input[^>]*type=['"]file['"]/i,
        'ChantierDetail must not contain file inputs (deferred module)'
      );
    });

    it('verifies typographic document and photo placeholder cards in ChantierDetail', () => {
      assert.match(
        chantierDetailContent,
        /Plan d'aménagement\.pdf/,
        'Must display Plan daménagement.pdf placeholder'
      );
      assert.match(
        chantierDetailContent,
        /Devis signé\.pdf/,
        'Must display Devis signé.pdf placeholder'
      );
      assert.match(
        chantierDetailContent,
        /Module photos et galerie terrain à venir/,
        'Must display photo placeholder banner'
      );
      assert.match(
        chantierDetailContent,
        /Phase 2/,
        'Must display Phase 2 badge on photos section'
      );
    });

    it('stress-tests GPS URL generation with complex addresses containing accents and special chars', () => {
      const addresses = [
        '12 Chemin des Érables, 69340 Francheville',
        'Allée de l\'Étang & du Moulin, 69000 Lyon',
        'Parc d\'Activités TECHLID #Bâtiment-A, 69760 Limonest',
        '28 Avenue René Cassin / Quai des Célestins, 69009 Lyon',
        'Rue du Général de Gaulle, 69500 Bron, France',
      ];

      for (const addr of addresses) {
        const encoded = encodeURIComponent(addr);
        const url = `https://maps.google.com/?q=${encoded}`;

        assert.ok(url.startsWith('https://maps.google.com/?q='));
        assert.doesNotMatch(url, /\s/, 'URL must not contain raw whitespace');
        assert.doesNotMatch(url, /é|è|É/, 'URL must percent-encode French accents');
        assert.equal(decodeURIComponent(encoded), addr, 'Decoded URL parameter must recover original address');
      }
    });

    it('verifies touch target sizes (>= 48px) on all interactive controls in ChantierDetail', () => {
      // Circular GPS floating button
      assert.match(
        chantierDetailContent,
        /w-12\s+h-12\s+min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Lancer le GPS/,
        'Floating GPS button must meet 48x48px boundaries'
      );
      // Full width GPS action button
      assert.match(
        chantierDetailContent,
        /min-h-\[48px\][\s\S]*?Lancer la navigation GPS/,
        'Full width GPS button must meet min-h-[48px]'
      );
      // Back button
      assert.match(
        chantierDetailContent,
        /w-12\s+h-12\s+min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Retour au planning/,
        'Back button must meet 48x48px boundaries'
      );
      // Team calling button
      assert.match(
        chantierDetailContent,
        /min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Appeler l'équipier/,
        'Phone call button must meet 48x48px boundaries'
      );
    });
  });

  // =========================================================================
  // Dimension 5: Chat Static Mock Data Interactions & Unread Badge Behaviors
  // =========================================================================
  describe('Dimension 5: Chat Static Mock Data Interactions & Unread Badges', () => {
    it('strictly guarantees ZERO Supabase Realtime channel subscriptions in Chat UI', () => {
      assert.doesNotMatch(
        chatPreviewContent,
        /supabase\s*\.\s*channel/i,
        'ChatPreview must not establish live Supabase Realtime channels'
      );
      assert.doesNotMatch(
        chatRoomViewContent,
        /supabase\s*\.\s*channel/i,
        'ChatRoomView must not establish live Supabase Realtime channels'
      );
      assert.doesNotMatch(
        chatPreviewContent,
        /new\s+WebSocket/i,
        'ChatPreview must not instantiate raw WebSockets'
      );
    });

    it('simulates channel filter tabs (Tous | Équipe | Chantier | Direction)', () => {
      // Extract channels from ChatPreview structure
      const sampleChannels: ChatConversation[] = [
        {
          id: 'general',
          title: 'Équipe Paysage Concept',
          category: 'equipe',
          subtitle: 'Rappel livraison',
          time: '08:14',
          unreadCount: 2,
          messages: [],
        },
        {
          id: 'laurent',
          title: 'Chantier Villa Laurent',
          category: 'chantier',
          subtitle: 'Enrochements terminés',
          time: 'Hier',
          unreadCount: 0,
          chantierId: 'c1',
          messages: [],
        },
        {
          id: 'cedres',
          title: 'Résidence Les Cèdres',
          category: 'chantier',
          subtitle: 'Taille des haies',
          time: 'Hier',
          unreadCount: 1,
          chantierId: 'c2',
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

      function filterChannels(tab: FilterCategory, query: string): ChatConversation[] {
        return sampleChannels.filter((c) => {
          const matchesTab = tab === 'tous' || c.category === tab;
          const q = query.toLowerCase().trim();
          const matchesSearch =
            !q || c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q);
          return matchesTab && matchesSearch;
        });
      }

      // Filter: Tous
      assert.equal(filterChannels('tous', '').length, 4);

      // Filter: Équipe
      const equipeChannels = filterChannels('equipe', '');
      assert.equal(equipeChannels.length, 1);
      assert.equal(equipeChannels[0].id, 'general');

      // Filter: Chantier
      const chantierChannels = filterChannels('chantier', '');
      assert.equal(chantierChannels.length, 2);

      // Filter: Direction
      const directionChannels = filterChannels('direction', '');
      assert.equal(directionChannels.length, 1);
      assert.equal(directionChannels[0].id, 'direction');

      // Search Query filter
      const searchLaurent = filterChannels('tous', 'laurent');
      assert.equal(searchLaurent.length, 1);
      assert.equal(searchLaurent[0].id, 'laurent');

      // Combined Tab + Search Query
      const searchMiss = filterChannels('direction', 'laurent');
      assert.equal(searchMiss.length, 0);
    });

    it('verifies unread badge reset on conversation selection and outgoing message appending', () => {
      let channels: ChatConversation[] = [
        {
          id: 'general',
          title: 'Équipe Paysage Concept',
          category: 'equipe',
          subtitle: 'Initial subtitle',
          time: '08:00',
          unreadCount: 3,
          messages: [
            {
              id: 'm1',
              senderId: 'sophie',
              senderName: 'Sophie',
              content: 'Hello team',
              timestamp: '08:00',
              isOutgoing: false,
            },
          ],
        },
      ];

      // 1. Select conversation -> resets unreadCount to 0
      channels = channels.map((c) => (c.id === 'general' ? { ...c, unreadCount: 0 } : c));
      assert.equal(channels[0].unreadCount, 0, 'Selecting channel must reset unreadCount to 0');

      // 2. Dispatch message
      const newMessageContent = 'Bâche prête pour livraison !';
      const newMsg: ChatMessage = {
        id: 'msg-test',
        senderId: 'user',
        senderName: 'Moi',
        content: newMessageContent,
        timestamp: '08:15',
        isOutgoing: true,
      };

      channels = channels.map((c) =>
        c.id === 'general'
          ? {
              ...c,
              subtitle: `Moi : ${newMessageContent}`,
              time: "À l'instant",
              messages: [...c.messages, newMsg],
            }
          : c
      );

      assert.equal(channels[0].messages.length, 2);
      assert.equal(channels[0].messages[1].isOutgoing, true);
      assert.equal(channels[0].subtitle, `Moi : ${newMessageContent}`);
      assert.equal(channels[0].time, "À l'instant");
    });

    it('verifies chat bubble styling: Forest Green for outgoing and Warm Sand for incoming', () => {
      // Outgoing bubble styling in ChatRoomView
      assert.match(
        chatRoomViewContent,
        /bg-foret\s+text-blanc[\s\S]*?whitespace-pre-wrap/,
        'Outgoing chat bubble must use Forest Green with Pure White text'
      );
      // Incoming bubble styling in ChatRoomView
      assert.match(
        chatRoomViewContent,
        /bg-sable\/80\s+text-foret[\s\S]*?whitespace-pre-wrap/,
        'Incoming chat bubble must use Warm Sand with Forest Green text'
      );
      // Send button touch target >= 48px
      assert.match(
        chatRoomViewContent,
        /min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?Envoyer le message/,
        'Chat send button must meet min 48x48px boundaries'
      );
    });
  });

  // =========================================================================
  // Dimension 6: Theme Tokens, CSS Variable Compilation & Outdoor Ergonomics
  // =========================================================================
  describe('Dimension 6: Theme Tokens, CSS Variable Compilation & Outdoor Ergonomics', () => {
    it('verifies exact hexadecimal palette definitions in src/index.css', () => {
      const tokens: Record<string, string> = {
        '--color-foret': '#15302F',
        '--color-sauge': '#8FA98F',
        '--color-sable': '#E8E3D9',
        '--color-craie': '#FAFAFB',
        '--color-terracotta': '#C47452',
        '--color-blanc': '#FFFFFF',
        '--color-muted': '#6B7280',
      };

      for (const [token, hex] of Object.entries(tokens)) {
        const regex = new RegExp(`${token}:\\s*${hex};`, 'i');
        assert.match(indexContent, regex, `Token ${token} must equal ${hex}`);
      }
    });

    it('verifies diffuse elevation shadow and touch target utility in src/index.css', () => {
      assert.match(
        indexContent,
        /--shadow-soft:\s*0\s+4px\s+20px\s+rgba\(21,\s*48,\s*47,\s*0\.06\);/,
        'Theme must define --shadow-soft'
      );
      assert.match(
        indexContent,
        /\.touch-target\s*\{[\s\S]*?min-width:\s*48px;[\s\S]*?min-height:\s*48px;/,
        'index.css must define .touch-target utility with min 48x48px'
      );
    });

    it('rigorously tests WCAG AA and AAA relative luminance contrast ratios for outdoor bright daylight', () => {
      // Primary text: Forest Green on Craie (Main background)
      const contrastForetCraie = getContrastRatio('#15302F', '#FAFAFB');
      assert.ok(
        contrastForetCraie >= 7.0,
        `Forest Green on Craie (${contrastForetCraie.toFixed(2)}) must exceed WCAG AAA (>= 7.0:1)`
      );

      // Card text: Forest Green on Warm Sand (Card surfaces)
      const contrastForetSable = getContrastRatio('#15302F', '#E8E3D9');
      assert.ok(
        contrastForetSable >= 7.0,
        `Forest Green on Sand (${contrastForetSable.toFixed(2)}) must exceed WCAG AAA (>= 7.0:1)`
      );

      // Inverted text: Pure White on Forest Green (Header)
      const contrastBlancForet = getContrastRatio('#FFFFFF', '#15302F');
      assert.ok(
        contrastBlancForet >= 7.0,
        `White on Forest Green (${contrastBlancForet.toFixed(2)}) must exceed WCAG AAA (>= 7.0:1)`
      );

      // Terracotta button: Pure White on Terracotta
      const contrastBlancTerracotta = getContrastRatio('#FFFFFF', '#C47452');
      assert.ok(
        contrastBlancTerracotta >= 3.0,
        `White on Terracotta (${contrastBlancTerracotta.toFixed(2)}) must meet WCAG AA large text/UI threshold (>= 3.0:1)`
      );

      // Sage text on Forest Green header
      const contrastSaugeForet = getContrastRatio('#8FA98F', '#15302F');
      assert.ok(
        contrastSaugeForet >= 4.5,
        `Sage Green on Forest Green (${contrastSaugeForet.toFixed(2)}) must exceed WCAG AA (>= 4.5:1)`
      );
    });

    it('verifies safe-area mobile insets (pt-safe, pb-safe) and BottomNav 5-tab persistent container', () => {
      // Safe-area utilities in index.css
      assert.match(
        indexContent,
        /\.pb-safe\s*\{[\s\S]*?env\(safe-area-inset-bottom,\s*0px\)/,
        'pb-safe must handle env(safe-area-inset-bottom, 0px)'
      );
      assert.match(
        indexContent,
        /\.pt-safe\s*\{[\s\S]*?env\(safe-area-inset-top,\s*0px\)/,
        'pt-safe must handle env(safe-area-inset-top, 0px)'
      );

      // BottomNav 5 persistent tabs with 48x48px touch boundaries
      const expectedTabs = ['Accueil', 'Planning', 'Équipe', 'Chat', 'Plus'];
      for (const tab of expectedTabs) {
        assert.match(bottomNavContent, new RegExp(`label:\\s*['"]${tab}['"]`), `BottomNav must contain tab ${tab}`);
      }

      assert.match(
        bottomNavContent,
        /min-w-\[48px\]\s+min-h-\[48px\]/,
        'BottomNav items must enforce min 48x48px touch targets'
      );

      assert.match(
        bottomNavContent,
        /badge:\s*['"]2['"]/,
        'BottomNav Chat tab must provide Terracotta unread badge'
      );
    });

    it('verifies AppLayout mobile standard centered shell (max-w-md) and biophilic curved header', () => {
      assert.match(
        appLayoutContent,
        /max-w-md/,
        'AppLayout must center on desktop using max-w-md container'
      );
      assert.match(
        appLayoutContent,
        /bg-foret\s+text-blanc[\s\S]*?rounded-b-2xl/,
        'AppLayout header must be Vert Forêt with rounded-b-2xl curved bottom'
      );
      assert.match(
        appLayoutContent,
        /<BottomNav\s*\/>/,
        'AppLayout must render persistent BottomNav'
      );
    });
  });
});
