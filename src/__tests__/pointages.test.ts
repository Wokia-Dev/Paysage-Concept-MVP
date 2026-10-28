/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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
} from '../lib/hours.ts';
import type { PointageLocal, Profile } from '../types/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Declarative Pointages - Unit & Integration Tests', () => {
  describe('T1 & T2: Hours Formatting (formatHours)', () => {
    it('formats whole decimal hours as Xh00', () => {
      assert.equal(formatHours(8), '8h00');
      assert.equal(formatHours(0), '0h00');
      assert.equal(formatHours(12), '12h00');
      assert.equal(formatHours(24), '24h00');
    });

    it('formats fractional decimal hours with correct padded minutes', () => {
      assert.equal(formatHours(7.5), '7h30');
      assert.equal(formatHours(0.25), '0h15');
      assert.equal(formatHours(0.75), '0h45');
      assert.equal(formatHours(8.1), '8h06');
    });

    it('handles negative hours correctly', () => {
      assert.equal(formatHours(-1.5), '-1h30');
      assert.equal(formatHours(-0.25), '-0h15');
    });

    it('safely handles non-finite inputs', () => {
      assert.equal(formatHours(NaN), '0h00');
      assert.equal(formatHours(Infinity), '0h00');
      assert.equal(formatHours(-Infinity), '0h00');
    });

    it('correctly handles boundary where rounded minutes hit 60', () => {
      assert.equal(formatHours(7.999), '8h00');
    });
  });

  describe('T1 & T2: Hours Validation (validateDailyHours)', () => {
    it('approves typical workday entries', () => {
      const res = validateDailyHours(8, 1, 0);
      assert.equal(res.valid, true);
      assert.equal(res.error, undefined);
    });

    it('approves workday with valid overtime', () => {
      const res = validateDailyHours(9.5, 1, 1.5);
      assert.equal(res.valid, true);
    });

    it('approves when overtime exactly equals total hours', () => {
      const res = validateDailyHours(4, 0, 4);
      assert.equal(res.valid, true);
    });

    it('approves zero hours (e.g. unworked day / reset)', () => {
      const res = validateDailyHours(0, 0, 0);
      assert.equal(res.valid, true);
    });

    it('rejects when overtime exceeds total hours worked', () => {
      const res = validateDailyHours(7, 1, 8);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /heures supplémentaires ne peuvent pas dépasser/i);
    });

    it('rejects negative values for any field', () => {
      assert.equal(validateDailyHours(-1, 0, 0).valid, false);
      assert.equal(validateDailyHours(8, -0.5, 0).valid, false);
      assert.equal(validateDailyHours(8, 1, -1).valid, false);
    });

    it('rejects values exceeding 24 hours', () => {
      assert.equal(validateDailyHours(25, 1, 0).valid, false);
      assert.equal(validateDailyHours(8, 25, 0).valid, false);
      assert.equal(validateDailyHours(8, 1, 25).valid, false);
    });

    it('rejects non-finite inputs', () => {
      assert.equal(validateDailyHours(NaN, 1, 0).valid, false);
      assert.equal(validateDailyHours(8, Infinity, 0).valid, false);
    });
  });

  describe('T1: Net Worked Hours (calculateNetWorkedHours)', () => {
    it('correctly subtracts pause from total hours', () => {
      assert.equal(calculateNetWorkedHours(8, 1), 7);
      assert.equal(calculateNetWorkedHours(7.5, 0.75), 6.75);
    });

    it('never returns negative net hours', () => {
      assert.equal(calculateNetWorkedHours(0.5, 1), 0);
      assert.equal(calculateNetWorkedHours(0, 2), 0);
    });

    it('handles non-finite gracefully', () => {
      assert.equal(calculateNetWorkedHours(NaN, 1), 0);
    });
  });

  describe('T3 & T4: Hours Summary & Team Aggregations', () => {
    const mockPointages: PointageLocal[] = [
      {
        id: 'pt-1',
        profile_id: 'user-1',
        chantier_id: 'ch-1',
        date: '2026-10-28',
        heures_totales: 8,
        temps_pause: 1,
        heures_sup: 0,
        synced: true,
      },
      {
        id: 'pt-2',
        profile_id: 'user-2',
        chantier_id: 'ch-1',
        date: '2026-10-28',
        heures_totales: 9.5,
        temps_pause: 1,
        heures_sup: 1.5,
        synced: true,
      },
      {
        id: 'pt-3',
        profile_id: 'user-3',
        chantier_id: 'ch-2',
        date: '2026-10-28',
        heures_totales: 7,
        temps_pause: 0.5,
        heures_sup: 0,
        synced: false,
      },
    ];

    const mockProfiles: Profile[] = [
      { id: 'user-1', nom: 'Dupont', prenom: 'Jean', role: 'ouvrier' },
      { id: 'user-2', nom: 'Vasseur', prenom: 'Marc', role: 'chef_equipe' },
      { id: 'user-3', nom: 'Bernard', prenom: 'Thomas', role: 'ouvrier' },
      { id: 'user-4', nom: 'Moreau', prenom: 'Lucas', role: 'ouvrier' },
    ];

    it('calculates linear hours summary across multiple pointages', () => {
      const summary = calculateHoursSummary(mockPointages);
      assert.equal(summary.totalHours, 24.5);
      assert.equal(summary.totalPause, 2.5);
      assert.equal(summary.totalOvertime, 1.5);
      assert.equal(summary.normalHours, 23);
    });

    it('aggregates supervisor team status accurately', () => {
      const teamSummary = aggregateTeamDailyStatus(mockPointages, mockProfiles, '2026-10-28');
      assert.equal(teamSummary.workersCount, 4);
      assert.equal(teamSummary.submittedCount, 3);
      assert.equal(teamSummary.totalTeamHours, 24.5);
      assert.equal(teamSummary.totalNormalHours, 23);
      assert.equal(teamSummary.totalOvertime, 1.5);
      assert.equal(teamSummary.totalPause, 2.5);
      assert.equal(
        teamSummary.totalTeamHours,
        teamSummary.totalNormalHours + teamSummary.totalOvertime,
        'Team hours must strictly equal normal hours + overtime hours'
      );

      const unsubmitted = teamSummary.statuses.find((s) => s.profile.id === 'user-4');
      assert.ok(unsubmitted);
      assert.equal(unsubmitted?.hasSubmitted, false);
      assert.equal(unsubmitted?.heuresTotales, 0);

      const overtimeWorker = teamSummary.statuses.find((s) => s.profile.id === 'user-2');
      assert.ok(overtimeWorker);
      assert.equal(overtimeWorker?.hasSubmitted, true);
      assert.equal(overtimeWorker?.heuresTotales, 9.5);
      assert.equal(overtimeWorker?.heuresSup, 1.5);
    });
  });

  describe('Daily Target & Smart Overtime Pre-Selection', () => {
    it('defaults to 7.0 hours as standard daily target', () => {
      assert.equal(DEFAULT_DAILY_TARGET, 7.0);
    });

    it('automatically sets overtime to 1h when entering 8h with 7h daily target', () => {
      assert.equal(calculateAutoOvertime(8, 7), 1);
    });

    it('automatically sets overtime to 0h when entering 6h with 7h daily target', () => {
      assert.equal(calculateAutoOvertime(6, 7), 0);
    });

    it('automatically sets overtime to 0h when entering exactly 7h with 7h daily target', () => {
      assert.equal(calculateAutoOvertime(7, 7), 0);
    });

    it('calculates fractional overtime correctly with decimal targets', () => {
      assert.equal(calculateAutoOvertime(9.5, 7.5), 2);
      assert.equal(calculateAutoOvertime(8.25, 7), 1.25);
      assert.equal(calculateAutoOvertime(7.5, 7), 0.5);
      assert.equal(calculateAutoOvertime(7, 7.5), 0);
    });

    it('safely handles non-finite and negative inputs', () => {
      assert.equal(calculateAutoOvertime(-2, 7), 0);
      assert.equal(calculateAutoOvertime(8, -5), 8);
      assert.equal(calculateAutoOvertime(NaN, 7), 0);
      assert.equal(calculateAutoOvertime(8, NaN), 0);
    });
  });

  describe('UI Clarity & Overtime Included Invariant', () => {
    it('calculates normal hours as total minus overtime', () => {
      assert.equal(calculateNormalHours(8, 1), 7);
      assert.equal(calculateNormalHours(7, 0), 7);
      assert.equal(calculateNormalHours(9.5, 1.5), 8);
      assert.equal(calculateNormalHours(10, 3), 7);
    });

    it('enforces normal hours is never negative even if overtime > total', () => {
      assert.equal(calculateNormalHours(5, 6), 0);
      assert.equal(calculateNormalHours(-2, 1), 0);
      assert.equal(calculateNormalHours(NaN, 1), 0);
    });

    it('guarantees invariant: normalHours + overtimeHours === totalHours', () => {
      const testCases = [
        { total: 8, sup: 1 },
        { total: 7, sup: 0 },
        { total: 9.5, sup: 1.5 },
        { total: 10.25, sup: 2.25 },
        { total: 4, sup: 0 },
      ];

      for (const tc of testCases) {
        const norm = calculateNormalHours(tc.total, tc.sup);
        assert.equal(
          norm + tc.sup,
          tc.total,
          `Invariant failed for total=${tc.total}, sup=${tc.sup}`
        );
      }
    });

    it('verifies Home.tsx contains target modifier and explicit overtime breakdown labels', () => {
      const homeContent = readFileSync(resolve(projectRoot, 'src/pages/Home.tsx'), 'utf-8');
      assert.match(homeContent, /isEditingTarget/);
      assert.match(homeContent, /calculateAutoOvertime/);
      assert.match(homeContent, /calculateNormalHours/);
      assert.match(homeContent, /Heures totales travaillées \(heures sup incluses\)/);
      assert.match(homeContent, /Dont heures supplémentaires/);
      assert.match(homeContent, /Ventilation du temps de travail/);
      assert.match(homeContent, /déjà incluses/);
    });
  });

  describe('Anti-Duplicate Upsert Logic & Dexie v2 Schema', () => {
    it('verifies db.ts declares version 2 with [profile_id+date] compound index', () => {
      const dbContent = readFileSync(resolve(projectRoot, 'src/lib/db.ts'), 'utf-8');
      assert.match(dbContent, /this\.version\(2\)/);
      assert.match(dbContent, /\[profile_id\+date\]/);
      assert.match(dbContent, /\.upgrade\(/);
    });

    it('verifies sync.ts uses upsert on (profile_id, date) and saveDailyPointage', () => {
      const syncContent = readFileSync(resolve(projectRoot, 'src/lib/sync.ts'), 'utf-8');
      assert.match(syncContent, /saveDailyPointage/);
      assert.match(syncContent, /onConflict:\s*['"]profile_id,date['"]/);
      assert.match(syncContent, /\[profile_id\+date\]/);
    });

    it('simulates idempotent daily pointage upsert retaining ID', () => {
      const profileId = 'user-abc-123';
      const date = '2026-10-28';
      const records = new Map<string, PointageLocal>();

      function mockSaveDaily(data: {
        profile_id: string;
        date: string;
        heures_totales: number;
        temps_pause: number;
        heures_sup: number;
      }) {
        const key = `${data.profile_id}_${data.date}`;
        const existing = records.get(key);
        const record: PointageLocal = {
          id: existing ? existing.id : 'generated-uuid-1',
          profile_id: data.profile_id,
          date: data.date,
          heures_totales: data.heures_totales,
          temps_pause: data.temps_pause,
          heures_sup: data.heures_sup,
          synced: false,
        };
        records.set(key, record);
        return record;
      }

      // First entry at morning: 4h
      const rec1 = mockSaveDaily({
        profile_id: profileId,
        date,
        heures_totales: 4,
        temps_pause: 0,
        heures_sup: 0,
      });
      assert.equal(rec1.id, 'generated-uuid-1');
      assert.equal(rec1.heures_totales, 4);
      assert.equal(records.size, 1);

      // Second entry at evening: 8h, 1h pause, 1h sup
      const rec2 = mockSaveDaily({
        profile_id: profileId,
        date,
        heures_totales: 8,
        temps_pause: 1,
        heures_sup: 1,
      });
      assert.equal(rec2.id, rec1.id);
      assert.equal(rec2.heures_totales, 8);
      assert.equal(rec2.temps_pause, 1);
      assert.equal(rec2.heures_sup, 1);
      assert.equal(records.size, 1);
    });
  });

  describe('Legacy Artifact & Keyword Removal', () => {
    it('verifies src/lib/geolocation.ts is deleted', () => {
      const geoPath = resolve(projectRoot, 'src/lib/geolocation.ts');
      assert.equal(existsSync(geoPath), false, 'src/lib/geolocation.ts should not exist');
    });

    it('verifies zero references to PointageType in src/types/database.ts', () => {
      const typesContent = readFileSync(
        resolve(projectRoot, 'src/types/database.ts'),
        'utf-8'
      );
      assert.doesNotMatch(typesContent, /PointageType/);
      assert.doesNotMatch(typesContent, /horodatage/);
    });

    it('verifies zero legacy clocking actions in src/pages/Home.tsx', () => {
      const homeContent = readFileSync(resolve(projectRoot, 'src/pages/Home.tsx'), 'utf-8');
      assert.doesNotMatch(homeContent, /PointageType/);
      assert.doesNotMatch(homeContent, /getQuickGeolocation/);
      assert.doesNotMatch(homeContent, /handlePointage\(/);
      assert.doesNotMatch(homeContent, /'arrivee'/);
      assert.doesNotMatch(homeContent, /'depart'/);
    });

    it('verifies SQL migration drops legacy pointage_type and pointages table with cascade', () => {
      const migrationPath = resolve(
        projectRoot,
        'supabase/migrations/20261028_refactor_pointages_declaratif.sql'
      );
      assert.ok(existsSync(migrationPath), 'SQL migration file must exist');
      const sql = readFileSync(migrationPath, 'utf-8');
      assert.match(sql, /DROP TABLE IF EXISTS public\.pointages CASCADE;/);
      assert.match(sql, /DROP TYPE IF EXISTS public\.pointage_type CASCADE;/);
      assert.match(sql, /CONSTRAINT pointages_profile_date_unique UNIQUE \(profile_id, date\)/);
      assert.match(sql, /CREATE POLICY "pointages_update_policy"/);
    });
  });
});
