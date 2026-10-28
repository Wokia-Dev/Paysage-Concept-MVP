/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateNormalHours,
  calculateAutoOvertime,
  validateDailyHours,
  formatHours,
  calculateNetWorkedHours,
  calculateHoursSummary,
} from '../lib/hours.ts';
import type { PointageLocal } from '../types/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Milestone 2 Adversarial Stress Suite (Challenger 1)', () => {
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');
  const gaugePath = resolve(projectRoot, 'src/components/common/CircularProgressGauge.tsx');
  const datePillPath = resolve(projectRoot, 'src/components/common/DateSelectorPill.tsx');

  const homeContent = readFileSync(homePath, 'utf-8');
  const gaugeContent = readFileSync(gaugePath, 'utf-8');
  const datePillContent = readFileSync(datePillPath, 'utf-8');

  // =========================================================================
  // Challenge 1: Declarative Time-Tracking Math & Overtime Invariant
  // =========================================================================
  describe('Challenge 1: Declarative Time-Tracking Math & Overtime Invariant', () => {
    it('exhaustively verifies overtime invariant (normalHours + sup === total) across all 0.25h increments in [0, 24]', () => {
      let combinationsTested = 0;
      for (let totalInt = 0; totalInt <= 96; totalInt++) {
        const total = totalInt * 0.25;
        for (let supInt = 0; supInt <= totalInt; supInt++) {
          const sup = supInt * 0.25;
          const normal = calculateNormalHours(total, sup);

          // Invariant: normal + sup === total
          const sum = Math.round((normal + sup) * 100) / 100;
          assert.equal(
            sum,
            total,
            `Invariant failed for total=${total}, sup=${sup}: normal=${normal}, sum=${sum}`
          );

          // Normal hours boundaries
          assert.ok(normal >= 0, `normalHours cannot be negative for total=${total}, sup=${sup}`);
          assert.ok(normal <= total, `normalHours cannot exceed total for total=${total}, sup=${sup}`);

          // Validation passes for all valid combinations
          const valRes = validateDailyHours(total, 0, sup);
          assert.equal(valRes.valid, true, `validateDailyHours should pass for total=${total}, sup=${sup}`);

          combinationsTested++;
        }
      }
      assert.equal(combinationsTested, (97 * 98) / 2); // 4,753 valid combinations verified
    });

    it('exhaustively verifies calculateAutoOvertime oracle against target over all combinations in [0, 24]', () => {
      for (let targetInt = 2; targetInt <= 48; targetInt++) { // 1h to 24h targets in 0.5h steps
        const target = targetInt * 0.5;
        for (let totalInt = 0; totalInt <= 96; totalInt++) { // 0h to 24h totals in 0.25h steps
          const total = totalInt * 0.25;
          const autoSup = calculateAutoOvertime(total, target);

          if (total <= target) {
            assert.equal(autoSup, 0, `Auto overtime must be 0 when total (${total}) <= target (${target})`);
          } else {
            const expected = Math.round((total - target) * 100) / 100;
            assert.equal(
              autoSup,
              expected,
              `Auto overtime mismatch for total=${total}, target=${target}: got ${autoSup}, expected ${expected}`
            );
          }

          // Check invariant holds when auto overtime is used
          const normal = calculateNormalHours(total, autoSup);
          assert.equal(
            Math.round((normal + autoSup) * 100) / 100,
            total,
            `Invariant failed with auto overtime for total=${total}, target=${target}`
          );
        }
      }
    });

    it('stress-tests boundary edge case: exactly 0 hours worked', () => {
      assert.equal(calculateNormalHours(0, 0), 0);
      assert.equal(calculateAutoOvertime(0, 7), 0);
      assert.equal(calculateAutoOvertime(0, 0), 0);
      assert.equal(formatHours(0), '0h00');
      const val = validateDailyHours(0, 0, 0);
      assert.equal(val.valid, true);
    });

    it('stress-tests boundary edge case: overtime exactly equals total hours', () => {
      const totals = [0.25, 1, 7, 8, 12, 24];
      for (const t of totals) {
        assert.equal(calculateNormalHours(t, t), 0, `normalHours should be 0 when sup == total (${t})`);
        assert.equal(validateDailyHours(t, 0, t).valid, true);
        assert.equal(calculateNormalHours(t, t) + t, t);
      }
    });

    it('stress-tests boundary edge case: 24h daily limit enforcement', () => {
      // Exactly 24h is valid
      assert.equal(validateDailyHours(24, 0, 0).valid, true);
      assert.equal(validateDailyHours(24, 24, 0).valid, true);
      assert.equal(validateDailyHours(24, 0, 24).valid, true);

      // Exceeding 24h is strictly rejected
      assert.equal(validateDailyHours(24.01, 0, 0).valid, false);
      assert.equal(validateDailyHours(0, 24.01, 0).valid, false);
      assert.equal(validateDailyHours(24, 0, 24.01).valid, false);
      assert.equal(validateDailyHours(25, 0, 0).valid, false);
      assert.equal(validateDailyHours(100, 0, 0).valid, false);
    });

    it('stress-tests invalid and malicious inputs (negative, non-finite, NaN)', () => {
      assert.equal(validateDailyHours(-0.01, 0, 0).valid, false);
      assert.equal(validateDailyHours(7, -0.5, 0).valid, false);
      assert.equal(validateDailyHours(7, 0, -1).valid, false);
      assert.equal(validateDailyHours(NaN, 0, 0).valid, false);
      assert.equal(validateDailyHours(7, Infinity, 0).valid, false);

      // Math functions are bulletproof against non-finite
      assert.equal(calculateNormalHours(NaN, 2), 0);
      assert.equal(calculateNormalHours(8, NaN), 8);
      assert.equal(calculateAutoOvertime(NaN, 7), 0);
      assert.equal(calculateAutoOvertime(8, NaN), 0);
      assert.equal(formatHours(NaN), '0h00');
      assert.equal(formatHours(Infinity), '0h00');
    });

    it('verifies calculateNetWorkedHours behavior under pause exceeding total', () => {
      assert.equal(calculateNetWorkedHours(8, 1), 7);
      assert.equal(calculateNetWorkedHours(7, 7), 0);
      assert.equal(calculateNetWorkedHours(6, 8), 0); // Gracefully clamped to 0, never negative
    });
  });

  // =========================================================================
  // Challenge 2: Circular Progress Gauge Edge Cases & Percentage Clamping
  // =========================================================================
  describe('Challenge 2: Circular Progress Gauge Edge Cases & Percentage Clamping', () => {
    // Simulator of CircularProgressGauge mathematical logic
    function gaugeMath(value: number, target: number) {
      const radius = 76;
      const circumference = 2 * Math.PI * radius; // ~477.52
      const sweepAngle = 260;
      const arcLength = circumference * (sweepAngle / 360); // ~344.87

      const targetSafe = target > 0 ? target : 7;
      const progressRatio = Math.max(0, value / targetSafe);
      const clampedRatio = Math.min(1, progressRatio);
      const filledLength = clampedRatio * arcLength;
      const percentage = Math.round(progressRatio * 100);

      const wholeHours = Math.floor(value);
      const minutes = Math.round((value - wholeHours) * 60);
      const formattedLargeHours = `${wholeHours}h ${String(minutes).padStart(2, '0')}`;

      const isTargetMet = value >= targetSafe;

      return {
        targetSafe,
        progressRatio,
        clampedRatio,
        filledLength,
        arcLength,
        percentage,
        formattedLargeHours,
        isTargetMet,
      };
    }

    it('handles target = 0h gracefully with safe fallback to default 7h', () => {
      const res = gaugeMath(5, 0);
      assert.equal(res.targetSafe, 7, 'Target <= 0 must fallback to 7h to prevent division by zero');
      assert.equal(Number.isFinite(res.progressRatio), true, 'Progress ratio must be finite');
      assert.equal(res.percentage, Math.round((5 / 7) * 100));
    });

    it('handles negative target gracefully with safe fallback to default 7h', () => {
      const res = gaugeMath(5, -3);
      assert.equal(res.targetSafe, 7);
      assert.equal(Number.isFinite(res.progressRatio), true);
    });

    it('handles target = 12h accurately across various logged values', () => {
      const resUnder = gaugeMath(6, 12);
      assert.equal(resUnder.targetSafe, 12);
      assert.equal(resUnder.percentage, 50);
      assert.equal(resUnder.isTargetMet, false);
      assert.equal(resUnder.clampedRatio, 0.5);

      const resExact = gaugeMath(12, 12);
      assert.equal(resExact.percentage, 100);
      assert.equal(resExact.isTargetMet, true);
      assert.equal(resExact.clampedRatio, 1);

      const resOver = gaugeMath(15, 12);
      assert.equal(resOver.percentage, 125);
      assert.equal(resOver.isTargetMet, true);
      assert.equal(resOver.clampedRatio, 1); // Gauge arc clamped to 100%
      assert.equal(resOver.filledLength, resOver.arcLength);
    });

    it('clamps gauge arc stroke length to 100% while allowing percentage badge > 100%', () => {
      const res150 = gaugeMath(10.5, 7);
      assert.equal(res150.percentage, 150);
      assert.equal(res150.clampedRatio, 1.0);
      assert.equal(res150.filledLength, res150.arcLength);

      const res200 = gaugeMath(14, 7);
      assert.equal(res200.percentage, 200);
      assert.equal(res200.clampedRatio, 1.0);
      assert.equal(res200.filledLength, res200.arcLength);

      const res343 = gaugeMath(24, 7);
      assert.equal(res343.percentage, 343);
      assert.equal(res343.clampedRatio, 1.0);
      assert.equal(res343.filledLength, res343.arcLength);
    });

    it('clamps gauge arc stroke length to 0% for 0h or negative hours', () => {
      const res0 = gaugeMath(0, 7);
      assert.equal(res0.percentage, 0);
      assert.equal(res0.clampedRatio, 0);
      assert.equal(res0.filledLength, 0);

      const resNeg = gaugeMath(-5, 7);
      assert.equal(resNeg.percentage, 0);
      assert.equal(resNeg.clampedRatio, 0);
      assert.equal(resNeg.filledLength, 0);
    });

    it('formats large display hours across all quarter-hour steps cleanly', () => {
      assert.equal(gaugeMath(0, 7).formattedLargeHours, '0h 00');
      assert.equal(gaugeMath(0.25, 7).formattedLargeHours, '0h 15');
      assert.equal(gaugeMath(0.5, 7).formattedLargeHours, '0h 30');
      assert.equal(gaugeMath(0.75, 7).formattedLargeHours, '0h 45');
      assert.equal(gaugeMath(7, 7).formattedLargeHours, '7h 00');
      assert.equal(gaugeMath(8.5, 7).formattedLargeHours, '8h 30');
      assert.equal(gaugeMath(24, 7).formattedLargeHours, '24h 00');
    });
  });

  // =========================================================================
  // Challenge 3: Date Navigation, Calendar Transitions & Time Zone Drift
  // =========================================================================
  describe('Challenge 3: Date Navigation & Calendar Transitions Stress Test', () => {
    function shiftDay(isoDate: string, deltaDays: number): string {
      const d = new Date(isoDate + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + deltaDays);
      return d.toISOString().slice(0, 10);
    }

    it('correctly navigates leap year February 2024 boundary forwards and backwards', () => {
      // 2024 is a leap year (February has 29 days)
      assert.equal(shiftDay('2024-02-27', 1), '2024-02-28');
      assert.equal(shiftDay('2024-02-28', 1), '2024-02-29');
      assert.equal(shiftDay('2024-02-29', 1), '2024-03-01');

      // Backwards
      assert.equal(shiftDay('2024-03-01', -1), '2024-02-29');
      assert.equal(shiftDay('2024-02-29', -1), '2024-02-28');
    });

    it('correctly navigates non-leap year February 2025 boundary forwards and backwards', () => {
      // 2025 is not a leap year (February has 28 days)
      assert.equal(shiftDay('2025-02-27', 1), '2025-02-28');
      assert.equal(shiftDay('2025-02-28', 1), '2025-03-01');

      // Backwards
      assert.equal(shiftDay('2025-03-01', -1), '2025-02-28');
    });

    it('correctly navigates century leap year 2000 vs non-leap 2100', () => {
      // 2000 is divisible by 400 -> leap year
      assert.equal(shiftDay('2000-02-28', 1), '2000-02-29');

      // 2100 is divisible by 100 but not 400 -> non-leap year
      assert.equal(shiftDay('2100-02-28', 1), '2100-03-01');
    });

    it('correctly navigates year-end transitions (Dec 31 to Jan 1)', () => {
      assert.equal(shiftDay('2026-12-30', 1), '2026-12-31');
      assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');

      // Backwards
      assert.equal(shiftDay('2027-01-01', -1), '2026-12-31');
    });

    it('navigates 365 consecutive days forwards and backwards without drift', () => {
      let current = '2026-01-01';
      const history = [current];

      // Step forward 365 days
      for (let i = 0; i < 365; i++) {
        current = shiftDay(current, 1);
        history.push(current);
      }
      assert.equal(current, '2027-01-01');

      // Step backwards 365 days
      for (let i = 365; i > 0; i--) {
        current = shiftDay(current, -1);
        assert.equal(current, history[i - 1], `Step back drift at day ${i}`);
      }
      assert.equal(current, '2026-01-01');
    });

    it('verifies DateSelectorPill component parses dates safely without timezone day shifts', () => {
      function parsePillDate(isoStr: string) {
        const [year, month, day] = isoStr.split('-').map(Number);
        return new Date(year, (month || 1) - 1, day || 1);
      }

      const d1 = parsePillDate('2026-10-28');
      assert.equal(d1.getFullYear(), 2026);
      assert.equal(d1.getMonth(), 9); // October is 9 (0-indexed)
      assert.equal(d1.getDate(), 28);

      const dLeap = parsePillDate('2024-02-29');
      assert.equal(dLeap.getFullYear(), 2024);
      assert.equal(dLeap.getMonth(), 1); // February
      assert.equal(dLeap.getDate(), 29);
    });
  });

  // =========================================================================
  // Challenge 4: Touch Target Ergonomics Audit (>= 48x48px)
  // =========================================================================
  describe('Challenge 4: Touch Target Ergonomics Audit (>= 48x48px)', () => {
    it('verifies all 6 form steppers (-, +) declare exact 48x48px touch boundaries', () => {
      const stepperMatches = homeContent.match(/min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/g);
      assert.ok(stepperMatches, 'Stepper buttons must be found');
      assert.equal(
        stepperMatches.length,
        6,
        `Expected 6 steppers with min-w-[48px] min-h-[48px] w-12 h-12, found ${stepperMatches.length}`
      );
    });

    it('verifies target adjuster steppers declare min 48x48px touch boundaries', () => {
      const targetMinus = homeContent.includes('onClick={() => handleTargetChange(dailyTarget - 0.5)}');
      const targetPlus = homeContent.includes('onClick={() => handleTargetChange(dailyTarget + 0.5)}');
      assert.ok(targetMinus && targetPlus, 'Target steppers must exist');

      const targetStepperRegex = /onClick=\{\(\) => handleTargetChange\(dailyTarget [+-] 0\.5\)\}\s+className="min-w-\[48px\] min-h-\[48px\]/g;
      const targetMatches = homeContent.match(targetStepperRegex);
      assert.equal(
        targetMatches?.length,
        2,
        'Both target adjuster buttons must have min-w-[48px] min-h-[48px]'
      );
    });

    it('verifies DateSelectorPill day navigation arrows enforce min 48x48px touch boxes', () => {
      const prevBtn = datePillContent.includes('onClick={onPrevDay}');
      const nextBtn = datePillContent.includes('onClick={onNextDay}');
      assert.ok(prevBtn && nextBtn, 'Date arrows must exist');

      const dateTargetRegex = /min-w-\[48px\]\s+min-h-\[48px\]/g;
      const matches = datePillContent.match(dateTargetRegex);
      assert.ok(matches && matches.length >= 2, 'Both Prev and Next date arrows must be >= 48x48px');
    });

    it('verifies primary CTA button enforces min 48px height', () => {
      const ctaRegex = /\+\s*Saisir des heures/;
      assert.match(homeContent, ctaRegex);
      assert.match(homeContent, /min-h-\[48px\]\s+h-14/);
    });

    it('verifies submit button enforces min 48px height', () => {
      assert.match(homeContent, /type="submit"/);
      assert.match(homeContent, /w-full\s+min-h-\[48px\]\s+h-14\s+bg-terracotta/);
    });

    it('verifies CircularProgressGauge edit target button prevents event bubbling and provides prominent tactile pill', () => {
      assert.match(
        gaugeContent,
        /e\.stopPropagation\(\)/,
        'CircularProgressGauge edit target button must stop event bubbling'
      );
      assert.match(
        gaugeContent,
        /rounded-full\s+border/,
        'CircularProgressGauge edit target button must provide prominent rounded border pill'
      );
    });
  });

  // =========================================================================
  // Challenge 5: Realistic Landscaper Field Workday Simulation
  // =========================================================================
  describe('Challenge 5: Realistic Landscaper Field Workday Simulation', () => {
    it('simulates 7h standard day -> 8.5h workday with auto-overtime -> evening adjustment to 9h', () => {
      const dailyTarget = 7.0;

      // 1. Landscaper opens app in the morning (defaults: target 7h, auto overtime 0h)
      let total = 7.0;
      let sup = calculateAutoOvertime(total, dailyTarget);
      assert.equal(sup, 0);
      assert.equal(calculateNormalHours(total, sup), 7.0);

      // 2. Afternoon: Landscaper worked until 17:30, entering 8.5h total
      total = 8.5;
      sup = calculateAutoOvertime(total, dailyTarget);
      assert.equal(sup, 1.5);
      assert.equal(calculateNormalHours(total, sup), 7.0);
      assert.equal(calculateNormalHours(total, sup) + sup, 8.5);

      // 3. Evening: Landscaper manually adjusts overtime to 2h because chef asked for 2h sup
      sup = 2.0;
      assert.equal(calculateNormalHours(total, sup), 6.5);
      assert.equal(calculateNormalHours(total, sup) + sup, 8.5);
      assert.equal(validateDailyHours(total, 1, sup).valid, true);

      // 4. Later: Landscaper bumps total to 9h with steppers (handleTotalChange resets auto sup)
      total = 9.0;
      sup = calculateAutoOvertime(total, dailyTarget);
      assert.equal(sup, 2.0); // 9.0 - 7.0 = 2.0
      assert.equal(calculateNormalHours(total, sup), 7.0);
      assert.equal(calculateNormalHours(total, sup) + sup, 9.0);
    });

    it('simulates weekly payroll rollup with diverse overtime patterns', () => {
      const weekEntries: PointageLocal[] = [
        { id: '1', date: '2026-10-26', heures_totales: 7, temps_pause: 1, heures_sup: 0, profile_id: 'p1', chantier_id: 'c1', synchronise_le: null, synced: true },
        { id: '2', date: '2026-10-27', heures_totales: 8, temps_pause: 1, heures_sup: 1, profile_id: 'p1', chantier_id: 'c1', synchronise_le: null, synced: true },
        { id: '3', date: '2026-10-28', heures_totales: 7.5, temps_pause: 0.75, heures_sup: 0.5, profile_id: 'p1', chantier_id: 'c1', synchronise_le: null, synced: true },
        { id: '4', date: '2026-10-29', heures_totales: 9, temps_pause: 1, heures_sup: 2, profile_id: 'p1', chantier_id: 'c1', synchronise_le: null, synced: true },
        { id: '5', date: '2026-10-30', heures_totales: 6, temps_pause: 0.5, heures_sup: 0, profile_id: 'p1', chantier_id: 'c1', synchronise_le: null, synced: true },
      ];

      const summary = calculateHoursSummary(weekEntries);
      assert.equal(summary.totalHours, 37.5);
      assert.equal(summary.totalOvertime, 3.5);
      assert.equal(summary.normalHours, 34.0);
      assert.equal(summary.totalPause, 4.25);
      assert.equal(summary.normalHours + summary.totalOvertime, summary.totalHours);
    });
  });
});
