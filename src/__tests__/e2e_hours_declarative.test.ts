/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatHours,
  validateDailyHours,
  calculateNetWorkedHours,
  calculateHoursSummary,
  aggregateTeamDailyStatus,
  calculateAutoOvertime,
  calculateNormalHours,
  DEFAULT_DAILY_TARGET,
  getStoredDailyTarget,
  setStoredDailyTarget,
} from '../lib/hours.ts';
import type { PointageLocal, Profile } from '../types/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('E2E Declarative Hours Tracking (R4 & R3)', () => {
  const homeContent = readFileSync(resolve(projectRoot, 'src/pages/Home.tsx'), 'utf-8');

  describe('Tier 1: Feature Coverage — Declarative Time-Tracking Form & Engine', () => {
    it('verifies standard daily target defaults to 7.0 hours (35h week)', () => {
      assert.equal(DEFAULT_DAILY_TARGET, 7.0);
    });

    it('calculates auto-overtime for workday exceeding daily target', () => {
      // 8h worked with 7h target -> 1h overtime
      assert.equal(calculateAutoOvertime(8, 7), 1);
      // 9.5h worked with 7h target -> 2.5h overtime
      assert.equal(calculateAutoOvertime(9.5, 7), 2.5);
    });

    it('calculates 0h overtime for workday within or equal to daily target', () => {
      assert.equal(calculateAutoOvertime(7, 7), 0);
      assert.equal(calculateAutoOvertime(6.5, 7), 0);
      assert.equal(calculateAutoOvertime(0, 7), 0);
    });

    it('calculates normal hours as total minus overtime', () => {
      assert.equal(calculateNormalHours(8, 1), 7);
      assert.equal(calculateNormalHours(7, 0), 7);
      assert.equal(calculateNormalHours(9.5, 2.5), 7);
    });

    it('verifies Home.tsx declares required form labels and stepper state hooks', () => {
      assert.match(homeContent, /isEditingTarget/, 'Home must support editing target state');
      assert.match(homeContent, /calculateAutoOvertime/, 'Home must utilize calculateAutoOvertime');
      assert.match(homeContent, /calculateNormalHours/, 'Home must utilize calculateNormalHours');
      assert.match(
        homeContent,
        /Heures totales travaillées \(heures sup incluses\)/,
        'Form must state that total hours include overtime'
      );
      assert.match(
        homeContent,
        /Dont heures supplémentaires/,
        'Form must include explicit overtime breakdown label'
      );
      assert.doesNotMatch(
        homeContent,
        /Ventilation du temps de travail/,
        'Form must not render separate work time breakdown card'
      );
      assert.match(
        homeContent,
        /déjà incluses/,
        'Form must clarify overtime hours are already included in total'
      );
    });
  });

  describe('Tier 2: Boundary & Corner Cases — Value Limits & Input Sanitization', () => {
    it('approves boundary case of exactly 0 hours worked (unworked day or reset)', () => {
      const res = validateDailyHours(0, 0, 0);
      assert.equal(res.valid, true);
    });

    it('approves boundary case of maximum 24 hours worked', () => {
      const res = validateDailyHours(24, 0, 17);
      assert.equal(res.valid, true);
    });

    it('rejects entries exceeding 24 hours for any parameter', () => {
      assert.equal(validateDailyHours(24.25, 0, 0).valid, false);
      assert.equal(validateDailyHours(8, 24.5, 0).valid, false);
      assert.equal(validateDailyHours(8, 1, 24.1).valid, false);
    });

    it('rejects negative values for any field', () => {
      assert.equal(validateDailyHours(-0.5, 0, 0).valid, false);
      assert.equal(validateDailyHours(8, -1, 0).valid, false);
      assert.equal(validateDailyHours(8, 1, -0.25).valid, false);
    });

    it('rejects entries where overtime strictly exceeds total hours', () => {
      const res = validateDailyHours(7, 1, 7.25);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /heures supplémentaires ne peuvent pas dépasser/i);
    });

    it('approves entry where overtime exactly equals total hours', () => {
      const res = validateDailyHours(5, 0, 5);
      assert.equal(res.valid, true);
    });

    it('handles fractional hour formatting boundaries with padded minutes', () => {
      assert.equal(formatHours(7.25), '7h15');
      assert.equal(formatHours(7.5), '7h30');
      assert.equal(formatHours(7.75), '7h45');
      assert.equal(formatHours(8.05), '8h03');
      assert.equal(formatHours(0.1), '0h06');
    });

    it('safely handles non-finite inputs in all hours math functions', () => {
      assert.equal(formatHours(NaN), '0h00');
      assert.equal(formatHours(Infinity), '0h00');
      assert.equal(calculateAutoOvertime(NaN, 7), 0);
      assert.equal(calculateAutoOvertime(8, NaN), 0);
      assert.equal(calculateNormalHours(NaN, 1), 0);
      assert.equal(calculateNetWorkedHours(NaN, 1), 0);
      assert.equal(validateDailyHours(NaN, 1, 0).valid, false);
    });
  });

  describe('Tier 3: Cross-Feature Interactions — Target Persistence & Gauge Mathematics', () => {
    it('simulates daily target persistence with worker profile scoping', () => {
      // Mock localStorage environment
      const memoryStore = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => memoryStore.get(k) || null,
        setItem: (k: string, v: string) => memoryStore.set(k, v),
        removeItem: (k: string) => memoryStore.delete(k),
        clear: () => memoryStore.clear(),
        length: 0,
        key: () => null,
      };

      const originalWindow = globalThis.window;
      // @ts-expect-error mock window
      globalThis.window = { localStorage: mockStorage };

      try {
        const workerA = 'worker-uuid-1';
        const workerB = 'worker-uuid-2';

        setStoredDailyTarget(8.5, workerA);
        setStoredDailyTarget(6.0, workerB);

        assert.equal(getStoredDailyTarget(workerA), 8.5);
        assert.equal(getStoredDailyTarget(workerB), 6.0);

        // Clamping check [1, 24]
        setStoredDailyTarget(30, workerA);
        assert.equal(getStoredDailyTarget(workerA), 24);

        setStoredDailyTarget(-5, workerB);
        assert.equal(getStoredDailyTarget(workerB), 1);
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it('computes horseshoe circular gauge progress and percentage clamping', () => {
      function computeGaugeProgress(heures: number, target: number): {
        percent: number;
        strokeDashOffset: number;
      } {
        const circumference = 2 * Math.PI * 45; // radius 45 -> ~282.74px
        const ratio = target > 0 ? Math.min(1.0, Math.max(0, heures / target)) : 0;
        const percent = Math.min(100, Math.round((heures / (target || 1)) * 100));
        const strokeDashOffset = circumference * (1 - ratio);
        return { percent, strokeDashOffset };
      }

      // 0h on 7h target -> 0%
      const g0 = computeGaugeProgress(0, 7);
      assert.equal(g0.percent, 0);

      // 3.5h on 7h target -> 50%
      const g50 = computeGaugeProgress(3.5, 7);
      assert.equal(g50.percent, 50);

      // 7h on 7h target -> 100%
      const g100 = computeGaugeProgress(7, 7);
      assert.equal(g100.percent, 100);
      assert.equal(Math.round(g100.strokeDashOffset), 0);

      // 9h on 7h target -> clamped to 100% on gauge circle
      const gOver = computeGaugeProgress(9, 7);
      assert.equal(gOver.percent, 100);
    });

    it('strictly guarantees invariant normalHours + overtime === totalHours across wide range', () => {
      const inputs = [
        { total: 0, target: 7 },
        { total: 5, target: 7 },
        { total: 7, target: 7 },
        { total: 8, target: 7 },
        { total: 9.75, target: 7.5 },
        { total: 12, target: 8 },
        { total: 14.5, target: 7 },
        { total: 24, target: 7 },
      ];

      for (const item of inputs) {
        const autoSup = calculateAutoOvertime(item.total, item.target);
        const norm = calculateNormalHours(item.total, autoSup);
        assert.equal(
          norm + autoSup,
          item.total,
          `Invariant breached for total=${item.total}, target=${item.target}`
        );
      }
    });
  });

  describe('Tier 4: Real-World Landscaper Field Workday & Payroll Aggregation', () => {
    it('simulates complete landscaper workday cycle with evening adjustment', () => {
      const dailyTarget = 7.0;

      // Morning start: no hours entered yet
      let worked = 0;
      let pause = 0;
      let sup = calculateAutoOvertime(worked, dailyTarget);
      assert.equal(worked, 0);
      assert.equal(sup, 0);
      assert.equal(calculateNetWorkedHours(worked, pause), 0);

      // Midday: Landscaper enters 4h before lunch with 30min pause
      worked = 4.0;
      pause = 0.5;
      sup = calculateAutoOvertime(worked, dailyTarget);
      assert.equal(sup, 0); // Still under 7h target
      assert.equal(calculateNormalHours(worked, sup), 4.0);
      assert.equal(calculateNetWorkedHours(worked, pause), 3.5);

      // Evening departure: Final day total is 9h with 1h pause
      worked = 9.0;
      pause = 1.0;
      sup = calculateAutoOvertime(worked, dailyTarget);
      assert.equal(sup, 2.0); // 9h - 7h = 2h overtime
      assert.equal(calculateNormalHours(worked, sup), 7.0);

      // Net worked time (total minus pause)
      const netTime = calculateNetWorkedHours(worked, pause);
      assert.equal(netTime, 8.0);
    });

    it('aggregates full 5-day payroll week for landscaper with mixed overtime', () => {
      const weeklyPointages: PointageLocal[] = [
        { id: '1', profile_id: 'p1', date: '2026-10-26', heures_totales: 7, temps_pause: 1, heures_sup: 0, synced: true },
        { id: '2', profile_id: 'p1', date: '2026-10-27', heures_totales: 8.5, temps_pause: 1, heures_sup: 1.5, synced: true },
        { id: '3', profile_id: 'p1', date: '2026-10-28', heures_totales: 8, temps_pause: 1, heures_sup: 1, synced: true },
        { id: '4', profile_id: 'p1', date: '2026-10-29', heures_totales: 7, temps_pause: 1, heures_sup: 0, synced: true },
        { id: '5', profile_id: 'p1', date: '2026-10-30', heures_totales: 9, temps_pause: 1, heures_sup: 2, synced: true },
      ];

      const summary = calculateHoursSummary(weeklyPointages);

      // Total hours: 7 + 8.5 + 8 + 7 + 9 = 39.5h
      assert.equal(summary.totalHours, 39.5);
      // Total overtime: 0 + 1.5 + 1 + 0 + 2 = 4.5h
      assert.equal(summary.totalOvertime, 4.5);
      // Total normal hours: 35.0h (standard French 35h legal week)
      assert.equal(summary.normalHours, 35.0);
      // Total pause: 5h
      assert.equal(summary.totalPause, 5.0);

      // Invariant: normal + overtime === total
      assert.equal(summary.normalHours + summary.totalOvertime, summary.totalHours);
    });

    it('verifies supervisor team daily presence and hours aggregation', () => {
      const mockProfiles: Profile[] = [
        { id: 'ouvrier-1', nom: 'Dubois', prenom: 'Julien', role: 'ouvrier' },
        { id: 'ouvrier-2', nom: 'Moreau', prenom: 'Alex', role: 'ouvrier' },
        { id: 'ouvrier-3', nom: 'Lefebvre', prenom: 'Luc', role: 'ouvrier' },
      ];

      const mockPointages: PointageLocal[] = [
        { id: 'pt-1', profile_id: 'ouvrier-1', date: '2026-10-28', heures_totales: 8, temps_pause: 1, heures_sup: 1, synced: true },
        { id: 'pt-2', profile_id: 'ouvrier-2', date: '2026-10-28', heures_totales: 7, temps_pause: 1, heures_sup: 0, synced: true },
        // ouvrier-3 has not submitted yet
      ];

      const teamStatus = aggregateTeamDailyStatus(mockPointages, mockProfiles, '2026-10-28');

      assert.equal(teamStatus.workersCount, 3);
      assert.equal(teamStatus.submittedCount, 2);
      assert.equal(teamStatus.totalTeamHours, 15);
      assert.equal(teamStatus.totalNormalHours, 14);
      assert.equal(teamStatus.totalOvertime, 1);

      const unsubmittedWorker = teamStatus.statuses.find((s) => s.profile.id === 'ouvrier-3');
      assert.ok(unsubmittedWorker);
      assert.equal(unsubmittedWorker?.hasSubmitted, false);
      assert.equal(unsubmittedWorker?.heuresTotales, 0);
    });
  });
});
