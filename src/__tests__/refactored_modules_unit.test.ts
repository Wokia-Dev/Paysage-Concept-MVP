/// <reference types="node" />
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatFrenchMonthYear,
  formatFrenchShortDate,
  formatFrenchWeekdayDate,
  formatISODate,
  getISOWeekNumber,
  getTodayDateString,
  getWeekMonday,
  parseMiddayUTC,
} from '../lib/dates.ts';
import {
  generateUUID,
  getInitials,
  getMapsUrl,
  getRoleLabel,
  getStatusBadge,
  sanitizePhoneHref,
} from '../lib/formatters.ts';
import {
  buildActiveDayData,
  buildChantierNameMap,
  computeAnalyticsMetrics,
  computeAnalyticsPeriod,
  shiftAnalyticsRefDate,
} from '../lib/hoursAnalytics.ts';
import {
  generateMonthGridDays,
  generateWeekDays,
  getMissionsForDate,
  getRelativeWeekLabel,
} from '../lib/planningUtils.ts';
import {
  createChantier,
  toggleWorkerAffectation,
  updateChantier,
  updateChantierStatut,
} from '../lib/chantiersService.ts';
import { supabase } from '../lib/supabase.ts';
import { db } from '../lib/db.ts';
import type { Affectation, Chantier, PointageLocal, Profile } from '../types/database.ts';

describe('Refactored Pure Modules & Services Unit Tests', () => {
  describe('1. src/lib/dates.ts', () => {
    it('parses YYYY-MM-DD at 12:00 UTC without timezone drift and formats ISO dates', () => {
      const d = parseMiddayUTC('2026-03-29'); // Spring DST date in Europe/Paris
      assert.equal(d.getUTCHours(), 12);
      assert.equal(formatISODate(d), '2026-03-29');

      const fallback = parseMiddayUTC('');
      assert.equal(Number.isNaN(fallback.getTime()), false);
    });

    it('computes ISO week numbers accurately across year transitions', () => {
      assert.equal(getISOWeekNumber(parseMiddayUTC('2026-01-01')), 1);
      assert.equal(getISOWeekNumber(parseMiddayUTC('2026-12-28')), 53);
      assert.equal(getISOWeekNumber(parseMiddayUTC('2027-01-04')), 1);
    });

    it('aligns any weekday (Mon-Sun) to its Monday in UTC', () => {
      // 2026-10-28 is Wednesday -> Monday 2026-10-26
      assert.equal(formatISODate(getWeekMonday(parseMiddayUTC('2026-10-28'))), '2026-10-26');
      // 2026-11-01 is Sunday -> Monday 2026-10-26
      assert.equal(formatISODate(getWeekMonday(parseMiddayUTC('2026-11-01'))), '2026-10-26');
      // 2026-10-26 is Monday -> Monday 2026-10-26
      assert.equal(formatISODate(getWeekMonday(parseMiddayUTC('2026-10-26'))), '2026-10-26');
    });

    it('formats French labels with capitalized initials and shifts today string', () => {
      assert.match(formatFrenchMonthYear(parseMiddayUTC('2026-10-15'), 'UTC'), /^Octobre 2026$/i);
      assert.match(formatFrenchWeekdayDate('2026-10-28'), /^Mercredi 28 octobre$/i);
      assert.match(formatFrenchShortDate('2026-10-28'), /28/);

      const today = getTodayDateString(0);
      const tomorrow = getTodayDateString(1);
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
      assert.notEqual(today, tomorrow);
    });
  });

  describe('2. src/lib/formatters.ts', () => {
    it('generates valid unique UUID v4 strings', () => {
      const u1 = generateUUID();
      const u2 = generateUUID();
      assert.match(u1, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      assert.notEqual(u1, u2);
    });

    it('formats role labels across full, short, and admin variants', () => {
      assert.equal(getRoleLabel('chef_equipe', 'full'), "Chef d'équipe");
      assert.equal(getRoleLabel('admin', 'full'), 'Administrateur');
      assert.equal(getRoleLabel('ouvrier', 'full'), 'Ouvrier paysagiste');

      assert.equal(getRoleLabel('chef_equipe', 'short'), 'Chef');
      assert.equal(getRoleLabel('admin', 'short'), 'Admin');
      assert.equal(getRoleLabel('ouvrier', 'short'), 'Ouvrier');
      assert.equal(getRoleLabel(undefined, 'short'), 'Ouvrier');

      assert.equal(getRoleLabel('admin', 'admin'), 'Administrateur / Conducteur');
    });

    it('computes initials, status badges, GPS URLs, and phone links safely', () => {
      assert.equal(getInitials('Jean', 'Dupont'), 'JD');
      assert.equal(getInitials('marc', undefined), 'M');
      assert.equal(getInitials(undefined, undefined), 'PC');
      assert.equal(getInitials('', '', 'JD'), 'JD');

      assert.equal(getStatusBadge('en_cours').label, 'En cours');
      assert.equal(getStatusBadge('termine').label, 'Terminé');
      assert.equal(getStatusBadge('en_attente').label, 'En attente');
      assert.equal(getStatusBadge(undefined).label, 'En attente');

      assert.equal(
        getMapsUrl('14 Chemin des Côtes, 69370'),
        'https://maps.google.com/?q=14%20Chemin%20des%20C%C3%B4tes%2C%2069370'
      );
      assert.equal(sanitizePhoneHref('06 12 34 56 78'), '0612345678');
    });
  });

  describe('3. src/lib/hoursAnalytics.ts', () => {
    it('computes ISO week and leap/non-leap month periods accurately', () => {
      const week = computeAnalyticsPeriod('week', '2026-10-28', '2026-10-28');
      assert.equal(week.startDateStr, '2026-10-26');
      assert.equal(week.endDateStr, '2026-11-01');
      assert.equal(week.daysList.length, 7);
      assert.equal(week.daysList[2].isToday, true);
      assert.match(week.periodLabel, /Semaine 44/);

      const leapFeb = computeAnalyticsPeriod('month', '2024-02-15', '2026-10-28');
      assert.equal(leapFeb.startDateStr, '2024-02-01');
      assert.equal(leapFeb.endDateStr, '2024-02-29');
      assert.equal(leapFeb.daysList.length, 29);

      const nonLeapFeb = computeAnalyticsPeriod('month', '2025-02-10', '2026-10-28');
      assert.equal(nonLeapFeb.endDateStr, '2025-02-28');
      assert.equal(nonLeapFeb.daysList.length, 28);
    });

    it('shifts period reference dates without drift', () => {
      assert.equal(shiftAnalyticsRefDate('2026-10-28', 'week', -1), '2026-10-21');
      assert.equal(shiftAnalyticsRefDate('2026-10-28', 'week', 1), '2026-11-04');
      assert.equal(shiftAnalyticsRefDate('2026-01-15', 'month', -1), '2025-12-15');
      assert.equal(shiftAnalyticsRefDate('2026-12-15', 'month', 1), '2027-01-15');
    });

    it('computes analytics KPI metrics and active day inspection data', () => {
      const pointages: PointageLocal[] = [
        {
          id: 'p1',
          profile_id: 'u1',
          chantier_id: 'c1',
          date: '2026-10-26',
          heures_totales: 8.5,
          temps_pause: 0.5,
          heures_sup: 1.5,
          synced: true,
        },
        {
          id: 'p2',
          profile_id: 'u1',
          chantier_id: null,
          date: '2026-10-27',
          heures_totales: 7,
          temps_pause: 0.5,
          heures_sup: 0,
          synced: false,
        },
      ];

      const metrics = computeAnalyticsMetrics(pointages);
      assert.equal(metrics.totalHours, 15.5);
      assert.equal(metrics.totalOvertime, 1.5);
      assert.equal(metrics.totalPause, 1.0);
      assert.equal(metrics.normalHours, 14.0);
      assert.equal(metrics.workedDaysCount, 2);

      const chantiers: Chantier[] = [
        { id: 'c1', nom_client: 'Villa Laurent', adresse: 'Lyon', statut: 'en_cours' },
      ];
      const chMap = buildChantierNameMap(chantiers);
      const period = computeAnalyticsPeriod('week', '2026-10-28', '2026-10-28');
      const ptMap = new Map(pointages.map((p) => [p.date, p]));

      const activePt = buildActiveDayData('2026-10-26', ptMap, period.daysList, chMap);
      assert.equal(activePt.hasSubmitted, true);
      assert.equal(activePt.norm, 7);
      assert.equal(activePt.sup, 1.5);
      assert.equal(activePt.chantierName, 'Villa Laurent');

      const emptyPt = buildActiveDayData('2026-10-28', ptMap, period.daysList, chMap);
      assert.equal(emptyPt.hasSubmitted, false);
      assert.equal(emptyPt.tot, 0);
      assert.equal(emptyPt.chantierName, 'Aucun chantier spécifié');
    });
  });

  describe('4. src/lib/planningUtils.ts', () => {
    const profiles: Profile[] = [
      { id: 'u1', nom: 'Dupont', prenom: 'Jean', role: 'ouvrier' },
      { id: 'u2', nom: 'Vasseur', prenom: 'Marc', role: 'chef_equipe' },
    ];
    const chantiers: Chantier[] = [
      { id: 'c1', nom_client: 'Villa Laurent', adresse: 'Adresse 1', statut: 'en_cours' },
      { id: 'c2', nom_client: 'Les Cèdres', adresse: 'Adresse 2', statut: 'en_attente' },
    ];
    const affectations: Affectation[] = [
      { id: 'a1', chantier_id: 'c1', profile_id: 'u1', date_intervention: '2026-10-28' },
      { id: 'a2', chantier_id: 'c1', profile_id: 'u2', date_intervention: '2026-10-28' },
      { id: 'a3', chantier_id: 'c2', profile_id: 'u2', date_intervention: '2026-10-28' },
    ];

    it('generates 7-day weeks and relative labels accurately', () => {
      const monday = getWeekMonday(parseMiddayUTC('2026-10-28'));
      const days = generateWeekDays(monday, '2026-10-28');
      assert.equal(days.length, 7);
      assert.equal(days[0].dateStr, '2026-10-26');
      assert.equal(days[6].dateStr, '2026-11-01');
      assert.equal(days[2].isToday, true);

      assert.equal(getRelativeWeekLabel(monday, '2026-10-28'), 'Cette semaine');
      const nextMon = getWeekMonday(parseMiddayUTC('2026-11-04'));
      assert.equal(getRelativeWeekLabel(nextMon, '2026-10-28'), 'Dans +1 sem.');
      const prevMon = getWeekMonday(parseMiddayUTC('2026-10-14'));
      assert.equal(getRelativeWeekLabel(prevMon, '2026-10-28'), 'Il y a 2 sem.');
    });

    it('filters missions by profile isolation vs global supervisor view', () => {
      // Worker u1 only sees c1 (not c2), but sees u2 as teammate on c1
      const workerMissions = getMissionsForDate({
        dateStr: '2026-10-28',
        affectations,
        chantiers,
        profiles,
        currentUserId: 'u1',
        targetFilterProfileId: 'u1',
      });
      assert.equal(workerMissions.length, 1);
      assert.equal(workerMissions[0].chantier.id, 'c1');
      assert.equal(workerMissions[0].assignedMembers.length, 2);
      assert.equal(workerMissions[0].isUserAssigned, true);

      // Supervisor global view (targetFilterProfileId = null) sees both c1 and c2
      const globalMissions = getMissionsForDate({
        dateStr: '2026-10-28',
        affectations,
        chantiers,
        profiles,
        currentUserId: 'u1',
        targetFilterProfileId: null,
      });
      assert.equal(globalMissions.length, 2);
    });

    it('generates complete 7-column month grids across leap and 6-row months', () => {
      const gridFeb2024 = generateMonthGridDays({
        currentMonthDate: new Date(2024, 1, 1),
        selectedDate: '2024-02-29',
        todayStr: '2024-02-29',
        getMissions: () => [],
      });
      assert.equal(gridFeb2024.length % 7, 0);
      assert.equal(gridFeb2024.filter((d) => d.isCurrentMonth).length, 29);
      assert.equal(gridFeb2024.find((d) => d.dateStr === '2024-02-29')?.isSelected, true);

      const gridAug2026 = generateMonthGridDays({
        currentMonthDate: new Date(2026, 7, 1),
        selectedDate: '2026-08-15',
        todayStr: '2026-08-15',
        getMissions: (dateStr) =>
          getMissionsForDate({
            dateStr,
            affectations,
            chantiers,
            profiles,
            currentUserId: 'u1',
            targetFilterProfileId: null,
          }),
      });
      assert.equal(gridAug2026.length, 42);
    });
  });

  describe('5. src/lib/chantiersService.ts (Supabase Error Propagation & Local Persistence)', () => {
    it('surfaces Supabase RLS error without mutating Dexie when session is active', async (t) => {
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
        insert: async () => ({ error: { message: 'new row violates row-level security policy' } }),
        update: () => ({
          eq: async () => ({ error: { message: 'permission denied for table chantiers' } }),
        }),
        delete: () => ({
          eq: async () => ({ error: { message: 'permission denied for table affectations' } }),
        }),
      }));
      const putStub = t.mock.method(db.chantiers, 'put', async () => 'id');
      const updateStub = t.mock.method(db.chantiers, 'update', async () => 1);
      const affDelStub = t.mock.method(db.affectations, 'delete', async () => {});

      try {
        const createRes = await createChantier({
          nom_client: 'Test Client',
          adresse: '1 Rue Test',
          statut: 'en_cours',
        });
        assert.equal(createRes.ok, false);
        assert.match(createRes.error || '', /Erreur Supabase : new row violates row-level security/);
        assert.equal(putStub.mock.callCount(), 0);

        const updateRes = await updateChantier('c1', {
          nom_client: 'Test',
          adresse: 'Addr',
          statut: 'termine',
        });
        assert.equal(updateRes.ok, false);
        assert.match(updateRes.error || '', /permission denied for table chantiers/);
        assert.equal(updateStub.mock.callCount(), 0);

        const statusRes = await updateChantierStatut('c1', 'termine');
        assert.equal(statusRes.ok, false);
        assert.match(statusRes.error || '', /permission denied for table chantiers/);
        assert.equal(updateStub.mock.callCount(), 0);

        const toggleRes = await toggleWorkerAffectation({
          chantierId: 'c1',
          profileId: 'u1',
          dateIntervention: '2026-10-28',
          existingAff: {
            id: 'aff-1',
            chantier_id: 'c1',
            profile_id: 'u1',
            date_intervention: '2026-10-28',
          },
        });
        assert.equal(toggleRes.ok, false);
        assert.match(toggleRes.error || '', /permission denied for table affectations/);
        assert.equal(affDelStub.mock.callCount(), 0);
      } finally {
        sessionStub.mock.restore();
        fromStub.mock.restore();
        putStub.mock.restore();
        updateStub.mock.restore();
        affDelStub.mock.restore();
        mock.restoreAll();
        Object.defineProperty(globalThis, 'navigator', {
          value: origNav,
          configurable: true,
        });
      }
    });

    it('succeeds locally in Demo mode (no active Supabase session) without calling Supabase mutations', async (t) => {
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
        throw new Error('Should not invoke supabase.from in local demo mode');
      });
      const putChStub = t.mock.method(db.chantiers, 'put', async () => 'id');
      const putAffStub = t.mock.method(db.affectations, 'put', async () => 'aff-id');

      try {
        const createRes = await createChantier({
          nom_client: '  Villa Démo  ',
          adresse: '  5 Avenue Test  ',
          statut: 'en_attente',
        });
        assert.equal(createRes.ok, true);
        assert.equal(createRes.data?.nom_client, 'Villa Démo');
        assert.equal(createRes.data?.adresse, '5 Avenue Test');
        assert.equal(putChStub.mock.callCount(), 1);
        assert.equal(fromStub.mock.callCount(), 0);

        const affRes = await toggleWorkerAffectation({
          chantierId: 'c1',
          profileId: 'u1',
          dateIntervention: '2026-10-28',
        });
        assert.equal(affRes.ok, true);
        assert.equal(affRes.data?.action, 'added');
        assert.equal(putAffStub.mock.callCount(), 1);
        assert.equal(fromStub.mock.callCount(), 0);
      } finally {
        sessionStub.mock.restore();
        fromStub.mock.restore();
        putChStub.mock.restore();
        putAffStub.mock.restore();
        Object.defineProperty(globalThis, 'navigator', {
          value: origNav,
          configurable: true,
        });
      }
    });

    it('rejects mutations with explicit offline error when Supabase JWT session is active offline', async (t) => {
      const origNav = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
      });

      const sessionStub = t.mock.method(supabase.auth, 'getSession', async () => ({
        data: { session: { user: { id: 'marc-id' } } },
        error: null,
      }));
      const fromStub = t.mock.method(supabase, 'from', () => {
        throw new Error('Should not invoke supabase.from while offline');
      });
      const putChStub = t.mock.method(db.chantiers, 'put', async () => 'id');
      const updateChStub = t.mock.method(db.chantiers, 'update', async () => 1);
      const putAffStub = t.mock.method(db.affectations, 'put', async () => 'aff-id');
      const delAffStub = t.mock.method(db.affectations, 'delete', async () => {});

      try {
        const createRes = await createChantier({
          nom_client: 'Offline JWT Client',
          adresse: '10 Rue Offline',
          statut: 'en_cours',
        });
        assert.equal(createRes.ok, false);
        assert.match(createRes.error || '', /Connexion réseau requise/);
        assert.equal(putChStub.mock.callCount(), 0);

        const updateRes = await updateChantier('c1', {
          nom_client: 'Test',
          adresse: 'Addr',
          statut: 'termine',
        });
        assert.equal(updateRes.ok, false);
        assert.match(updateRes.error || '', /Connexion réseau requise/);
        assert.equal(updateChStub.mock.callCount(), 0);

        const statusRes = await updateChantierStatut('c1', 'termine');
        assert.equal(statusRes.ok, false);
        assert.match(statusRes.error || '', /Connexion réseau requise/);
        assert.equal(updateChStub.mock.callCount(), 0);

        const toggleRes = await toggleWorkerAffectation({
          chantierId: 'c1',
          profileId: 'u1',
          dateIntervention: '2026-10-28',
        });
        assert.equal(toggleRes.ok, false);
        assert.match(toggleRes.error || '', /Connexion réseau requise/);
        assert.equal(putAffStub.mock.callCount(), 0);
        assert.equal(delAffStub.mock.callCount(), 0);
        assert.equal(fromStub.mock.callCount(), 0);
      } finally {
        sessionStub.mock.restore();
        fromStub.mock.restore();
        putChStub.mock.restore();
        updateChStub.mock.restore();
        putAffStub.mock.restore();
        delAffStub.mock.restore();
        Object.defineProperty(globalThis, 'navigator', {
          value: origNav,
          configurable: true,
        });
      }
    });

    it('distinguishes offline Demo mode (allowed) vs offline non-demo stored profile (blocked)', async (t) => {
      const origNav = globalThis.navigator;
      const origLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
      const store = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      };

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
      });
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        configurable: true,
      });

      const sessionStub = t.mock.method(supabase.auth, 'getSession', async () => ({
        data: { session: null },
        error: null,
      }));
      const putChStub = t.mock.method(db.chantiers, 'put', async () => 'id');

      try {
        // Non-demo stored profile while offline -> blocked
        store.set('paysage_active_profile_id', 'marc-id');
        const blockedRes = await createChantier({
          nom_client: 'Client Offline',
          adresse: 'Rue Offline',
          statut: 'en_cours',
        });
        assert.equal(blockedRes.ok, false);
        assert.match(blockedRes.error || '', /Connexion réseau requise/);
        assert.equal(putChStub.mock.callCount(), 0);

        // Demo mode while offline -> allowed locally in Dexie
        store.set('paysage_is_demo', 'true');
        const demoRes = await createChantier({
          nom_client: 'Client Démo Offline',
          adresse: 'Rue Démo',
          statut: 'en_attente',
        });
        assert.equal(demoRes.ok, true);
        assert.equal(putChStub.mock.callCount(), 1);
      } finally {
        sessionStub.mock.restore();
        putChStub.mock.restore();
        Object.defineProperty(globalThis, 'navigator', {
          value: origNav,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'localStorage', {
          value: origLocalStorage,
          configurable: true,
        });
      }
    });
  });
});
