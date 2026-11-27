/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_WORKDAYS,
  computeDayWorkerConflicts,
  computePeriodDiff,
  computePeriodWorkerStats,
  expandDateRange,
  formatBatchAffectationFeedback,
  getDefaultPeriodForChantier,
  getInitialDailyDateForChantier,
  getPreviousActiveDate,
  getWeekPeriod,
} from '../lib/affectationsUtils.ts';
import { applyBatchAffectations } from '../lib/chantiersService.ts';
import { supabase } from '../lib/supabase.ts';
import { db } from '../lib/db.ts';
import type { Affectation, Chantier } from '../types/database.ts';
import {
  readChantierDetailBundle,
  readChantiersBundle,
  readFilesConcat,
} from './helpers/sourceReader.ts';

describe('Système d’affectation par période & jour par jour', () => {
  describe('1. Pure utilities (src/lib/affectationsUtils.ts)', () => {
    it('computes default period from chantier dates or falls back to current Mon-Fri week', () => {
      assert.deepEqual(
        getDefaultPeriodForChantier(
          { date_debut: '2026-11-30', date_fin: '2026-12-11' },
          '2026-11-27'
        ),
        { startDate: '2026-11-30', endDate: '2026-12-11' }
      );

      assert.deepEqual(
        getDefaultPeriodForChantier({ date_debut: '2026-12-01', date_fin: null }, '2026-11-27'),
        { startDate: '2026-12-01', endDate: '2026-12-01' }
      );

      // 2026-11-27 is a Friday -> Monday is 2026-11-23, Friday is 2026-11-27
      assert.deepEqual(
        getDefaultPeriodForChantier({ date_debut: null, date_fin: null }, '2026-11-27'),
        { startDate: '2026-11-23', endDate: '2026-11-27' }
      );

      // Next week shortcut
      assert.deepEqual(getWeekPeriod(1, '2026-11-27'), {
        startDate: '2026-11-30',
        endDate: '2026-12-04',
      });
    });

    it('picks smart initial daily date inside chantier range when possible', () => {
      assert.equal(
        getInitialDailyDateForChantier(
          { date_debut: '2026-11-23', date_fin: '2026-12-04' },
          '2026-11-27'
        ),
        '2026-11-27'
      );
      assert.equal(
        getInitialDailyDateForChantier(
          { date_debut: '2026-12-07', date_fin: '2026-12-11' },
          '2026-11-27'
        ),
        '2026-12-07'
      );
    });

    it('expands date range excluding weekends by default and supports custom weekdays', () => {
      // 2026-11-23 (Mon) to 2026-11-29 (Sun) -> 5 workdays
      const workweek = expandDateRange('2026-11-23', '2026-11-29', DEFAULT_WORKDAYS);
      assert.equal(workweek.truncated, false);
      assert.deepEqual(workweek.dates, [
        '2026-11-23',
        '2026-11-24',
        '2026-11-25',
        '2026-11-26',
        '2026-11-27',
      ]);

      // Include Saturday (6)
      const withSat = expandDateRange('2026-11-23', '2026-11-29', [1, 2, 3, 4, 5, 6]);
      assert.equal(withSat.dates.length, 6);
      assert.equal(withSat.dates[5], '2026-11-28');

      // Custom Mon/Wed/Fri recurrence
      const mwf = expandDateRange('2026-11-23', '2026-11-29', [1, 3, 5]);
      assert.deepEqual(mwf.dates, ['2026-11-23', '2026-11-25', '2026-11-27']);

      // Guard against inverted range and huge spans
      assert.deepEqual(expandDateRange('2026-11-30', '2026-11-23').dates, []);
      const capped = expandDateRange('2026-01-01', '2026-12-31', [0, 1, 2, 3, 4, 5, 6], 10);
      assert.equal(capped.truncated, true);
      assert.equal(capped.dates.length, 10);
    });

    it('computes period diff without duplicates in add mode and removes unselected in replace mode', () => {
      const existing: Affectation[] = [
        { id: 'a1', chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-23' },
        { id: 'a2', chantier_id: 'c1', profile_id: 'p2', date_intervention: '2026-11-23' },
        { id: 'a3', chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-24' },
        // Other chantier must never be touched
        { id: 'a4', chantier_id: 'c2', profile_id: 'p2', date_intervention: '2026-11-23' },
      ];
      const dates = ['2026-11-23', '2026-11-24', '2026-11-25'];

      const addDiff = computePeriodDiff({
        chantierId: 'c1',
        dates,
        selectedWorkerIds: ['p1', 'p3'],
        mode: 'add',
        existingAffectations: existing,
      });
      // p1 already on 23 & 24 -> add 25 only; p3 -> add 23, 24, 25 => 4 adds, 0 removes
      assert.equal(addDiff.toRemoveIds.length, 0);
      assert.equal(addDiff.toAdd.length, 4);
      assert.ok(
        addDiff.toAdd.some(
          (item) => item.profile_id === 'p1' && item.date_intervention === '2026-11-25'
        )
      );

      const replaceDiff = computePeriodDiff({
        chantierId: 'c1',
        dates,
        selectedWorkerIds: ['p1'],
        mode: 'replace',
        existingAffectations: existing,
      });
      // p1 needs 25 added; p2 on 23 must be removed; c2's a4 must stay untouched
      assert.deepEqual(replaceDiff.toRemoveIds, ['a2']);
      assert.deepEqual(replaceDiff.toAdd, [
        { chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-25' },
      ]);
    });

    it('computes worker period stats and non-blocking multi-chantier conflicts', () => {
      const chantiers: Chantier[] = [
        { id: 'c1', nom_client: 'Villa Laurent', adresse: 'A', statut: 'en_cours' },
        { id: 'c2', nom_client: 'Parc Techlid', adresse: 'B', statut: 'en_cours' },
      ];
      const affectations: Affectation[] = [
        { id: '1', chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-23' },
        { id: '2', chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-24' },
        { id: '3', chantier_id: 'c2', profile_id: 'p1', date_intervention: '2026-11-25' },
      ];

      const stats = computePeriodWorkerStats({
        chantierId: 'c1',
        profileId: 'p1',
        dates: ['2026-11-23', '2026-11-24', '2026-11-25'],
        affectations,
        chantiers,
      });
      assert.equal(stats.assignedCount, 2);
      assert.equal(stats.totalDays, 3);
      assert.equal(stats.isPartiallyAssigned, true);
      assert.equal(stats.isFullyAssigned, false);
      assert.equal(stats.otherChantiers.length, 1);
      assert.equal(stats.otherChantiers[0].nomClient, 'Parc Techlid');

      const dayConflicts = computeDayWorkerConflicts({
        chantierId: 'c1',
        profileId: 'p1',
        dateStr: '2026-11-25',
        affectations,
        chantiers,
      });
      assert.equal(dayConflicts.length, 1);
      assert.equal(dayConflicts[0].chantierId, 'c2');
    });

    it('resolves previous active date in period or calendar day-1 and formats feedback', () => {
      assert.equal(
        getPreviousActiveDate('2026-11-30', ['2026-11-27', '2026-11-30']),
        '2026-11-27'
      );
      assert.equal(getPreviousActiveDate('2026-11-27', ['2026-11-27', '2026-11-30']), '2026-11-26');
      assert.equal(formatBatchAffectationFeedback(0, 0), 'Aucune modification à appliquer');
      assert.equal(formatBatchAffectationFeedback(3, 0), '3 affectation(s) ajoutée(s)');
      assert.equal(formatBatchAffectationFeedback(0, 2), '2 affectation(s) retirée(s)');
      assert.equal(formatBatchAffectationFeedback(4, 1), 'Équipe mise à jour (+4 / -1)');
    });
  });

  describe('2. Batch service persistence (applyBatchAffectations)', () => {
    it('applies batch deletions and insertions locally in Demo mode without calling Supabase', async (t) => {
      const origNav = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        configurable: true,
      });

      const sessionStub = t.mock.method(supabase.auth, 'getSession', async () => ({
        data: { session: null },
        error: null,
      }));
      const fromStub = t.mock.method(supabase, 'from', () => {
        throw new Error('Should not invoke supabase.from in Demo mode');
      });
      const bulkDelStub = t.mock.method(db.affectations, 'bulkDelete', async () => {});
      const bulkPutStub = t.mock.method(db.affectations, 'bulkPut', async () => 'id');

      try {
        const res = await applyBatchAffectations({
          toRemoveIds: ['old-1'],
          toAdd: [
            { chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-23' },
            { chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-24' },
          ],
        });
        assert.equal(res.ok, true);
        assert.deepEqual(res.data, { addedCount: 2, removedCount: 1 });
        assert.equal(bulkDelStub.mock.callCount(), 1);
        assert.equal(bulkPutStub.mock.callCount(), 1);
        assert.equal(fromStub.mock.callCount(), 0);
      } finally {
        sessionStub.mock.restore();
        fromStub.mock.restore();
        bulkDelStub.mock.restore();
        bulkPutStub.mock.restore();
        Object.defineProperty(globalThis, 'navigator', {
          value: origNav,
          configurable: true,
        });
      }
    });

    it('rejects batch mutations when offline with active Supabase JWT session', async (t) => {
      const origNav = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
      });

      const sessionStub = t.mock.method(supabase.auth, 'getSession', async () => ({
        data: { session: { user: { id: 'marc-id' } } },
        error: null,
      }));
      const bulkPutStub = t.mock.method(db.affectations, 'bulkPut', async () => 'id');

      try {
        const res = await applyBatchAffectations({
          toRemoveIds: [],
          toAdd: [{ chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-23' }],
        });
        assert.equal(res.ok, false);
        assert.match(res.error || '', /Connexion réseau requise/);
        assert.equal(bulkPutStub.mock.callCount(), 0);
      } finally {
        sessionStub.mock.restore();
        bulkPutStub.mock.restore();
        Object.defineProperty(globalThis, 'navigator', {
          value: origNav,
          configurable: true,
        });
      }
    });

    it('propagates Supabase RLS errors during batch insert without mutating Dexie', async (t) => {
      const origNav = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        configurable: true,
      });

      const sessionStub = t.mock.method(supabase.auth, 'getSession', async () => ({
        data: { session: { user: { id: 'marc-id' } } },
        error: null,
      }));
      const fromStub = t.mock.method(supabase, 'from', () => ({
        insert: async () => ({ error: { message: 'permission denied for table affectations' } }),
      }));
      const bulkPutStub = t.mock.method(db.affectations, 'bulkPut', async () => 'id');

      try {
        const res = await applyBatchAffectations({
          toRemoveIds: [],
          toAdd: [{ chantier_id: 'c1', profile_id: 'p1', date_intervention: '2026-11-23' }],
        });
        assert.equal(res.ok, false);
        assert.match(res.error || '', /permission denied for table affectations/);
        assert.equal(bulkPutStub.mock.callCount(), 0);
      } finally {
        sessionStub.mock.restore();
        fromStub.mock.restore();
        bulkPutStub.mock.restore();
        Object.defineProperty(globalThis, 'navigator', {
          value: origNav,
          configurable: true,
        });
      }
    });
  });

  describe('3. UI & Accessibility Contracts (Chantiers & ChantierDetail)', () => {
    const chantiersBundle = readChantiersBundle();
    const detailBundle = readChantierDetailBundle();

    it('integrates unified Par période & Jour par jour modes in both Chantiers and ChantierDetail', () => {
      for (const bundle of [chantiersBundle, detailBundle]) {
        assert.match(bundle, /Par période/);
        assert.match(bundle, /Jour par jour/);
        assert.match(bundle, /Copier la veille/);
        assert.match(bundle, /Ajouter à l'existant/);
        assert.match(bundle, /Remplacer l'équipe/);
        assert.match(bundle, /Aussi sur :/);
        assert.match(bundle, /min-h-\[48px\]/);
        assert.match(bundle, /dark:bg-\[#172322\]/);
      }
    });

    it('keeps each new component concise (<= 300 lines)', () => {
      for (const path of [
        'src/components/chantiers/ChantierAffectationManager.tsx',
        'src/components/chantiers/AffectationPeriodTab.tsx',
        'src/components/chantiers/AffectationDailyTab.tsx',
        'src/components/chantiers/AffectationWorkerRowContent.tsx',
        'src/components/chantiers/ChantierAssignModal.tsx',
        'src/components/chantiers/ChantierSupervisorPanel.tsx',
      ]) {
        const lineCount = readFilesConcat([path]).split('\n').length;
        assert.ok(lineCount <= 300, `${path} should remain <= 300 lines (got ${lineCount})`);
      }
    });
  });
});
