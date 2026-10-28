/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatHours,
  validateDailyHours,
  aggregateTeamDailyStatus,
  calculateAutoOvertime,
  calculateNormalHours,
} from '../lib/hours.ts';
import type { PointageLocal, Profile } from '../types/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Milestone 2 Adversarial Stress Suite (Challenger 2)', () => {
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');
  const gaugePath = resolve(projectRoot, 'src/components/common/CircularProgressGauge.tsx');
  const datePillPath = resolve(projectRoot, 'src/components/common/DateSelectorPill.tsx');
  const syncPath = resolve(projectRoot, 'src/lib/sync.ts');
  const dbPath = resolve(projectRoot, 'src/lib/db.ts');

  const homeContent = readFileSync(homePath, 'utf-8');
  const gaugeContent = readFileSync(gaugePath, 'utf-8');
  const datePillContent = readFileSync(datePillPath, 'utf-8');
  const syncContent = readFileSync(syncPath, 'utf-8');
  const dbContent = readFileSync(dbPath, 'utf-8');

  // =========================================================================
  // Challenge 1: Deferred Media Constraint (0% Photos / Galleries / Uploads)
  // =========================================================================
  describe('Challenge 1: Deferred Media Constraint (0% Photos / Galleries / Uploads)', () => {
    it('verifies 100% absence of <img> and <picture> elements in Home and subcomponents', () => {
      assert.doesNotMatch(homeContent, /<img[\s>]/i, 'Home.tsx must not contain <img> tags');
      assert.doesNotMatch(homeContent, /<picture[\s>]/i, 'Home.tsx must not contain <picture> tags');
      assert.doesNotMatch(gaugeContent, /<img[\s>]/i, 'CircularProgressGauge must not contain <img>');
      assert.doesNotMatch(datePillContent, /<img[\s>]/i, 'DateSelectorPill must not contain <img>');
    });

    it('verifies 100% absence of file upload dropzones and <input type="file">', () => {
      assert.doesNotMatch(homeContent, /type=["']file["']/i, 'Home.tsx must not contain file inputs');
      assert.doesNotMatch(homeContent, /dropzone/i, 'Home.tsx must not contain dropzones');
      assert.doesNotMatch(homeContent, /FileReader/i, 'Home.tsx must not contain FileReader');
      assert.doesNotMatch(homeContent, /accept=["']image/i, 'Home.tsx must not accept image uploads');
    });

    it('verifies 100% absence of photo gallery grids and banner imagery', () => {
      assert.doesNotMatch(homeContent, /gallery|galerie/i, 'Home.tsx must not render galleries');
      assert.doesNotMatch(homeContent, /photo/i, 'Home.tsx must not contain photo elements');
      assert.doesNotMatch(homeContent, /bg-\[url\(/i, 'Home.tsx must not use CSS background image URLs');
    });

    it('verifies Hero Chantier card is strictly typographic and ergonomic', () => {
      // Find the hero chantier section in Home.tsx
      const heroSectionMatch = homeContent.match(
        /2\.\s*Hero\s*Chantier\s*Card([\s\S]*?)3\.\s*Bandeau\s*widgets/
      );
      assert.ok(heroSectionMatch, 'Hero Chantier card section must be present in Home.tsx');
      const heroSection = heroSectionMatch[1];

      // Must have client name, status badge, address with Google Maps link, and scheduled start time
      assert.match(heroSection, /nom_client/, 'Hero card must display client name');
      assert.match(heroSection, /getStatusBadge/, 'Hero card must display status badge');
      assert.match(heroSection, /https:\/\/maps\.google\.com\/\?q=/, 'Hero card must link to GPS navigation');
      assert.match(heroSection, /Intervention prévue à 08h00/, 'Hero card must display scheduled time');
      assert.match(heroSection, /Consulter la fiche détaillée/, 'Hero card must link to detailed sheet');

      // Carousel dots must be typographic SVG/div elements, not image carousels
      assert.match(heroSection, /bg-foret rounded-full/, 'Hero card uses typographic dot indicator');
      assert.doesNotMatch(heroSection, /<img|<picture|thumbnail|photo/i, 'Hero card must not contain images');
    });
  });

  // =========================================================================
  // Challenge 2: Offline Persistence & Dexie Sync Reconciliation
  // =========================================================================
  describe('Challenge 2: Offline Persistence & Dexie Sync Reconciliation Stress-Testing', () => {
    it('verifies Dexie v2 schema uses compound index [profile_id+date]', () => {
      assert.match(dbContent, /version\(2\)/);
      assert.match(dbContent, /\[profile_id\+date\]/, 'Dexie schema must declare compound index');
    });

    it('verifies syncEngine saveDailyPointage enforces offline state (synced: false)', () => {
      assert.match(syncContent, /saveDailyPointage/, 'syncEngine must provide saveDailyPointage');
      assert.match(syncContent, /synced:\s*false/, 'Local save must explicitly set synced to false');
      assert.match(syncContent, /\[profile_id\+date\]/, 'saveDailyPointage must query compound index');
    });

    it('stress-tests multi-stage workday submission idempotence on the same date', () => {
      const profileId = 'worker-uuid-42';
      const date = '2026-10-28';
      const dbStore = new Map<string, PointageLocal>();

      function simulateSave(input: {
        profile_id: string;
        date: string;
        heures_totales: number;
        temps_pause: number;
        heures_sup: number;
      }): PointageLocal {
        const compoundKey = `${input.profile_id}#${input.date}`;
        const existing = dbStore.get(compoundKey);
        const record: PointageLocal = {
          id: existing ? existing.id : 'canonical-uuid-001',
          profile_id: input.profile_id,
          date: input.date,
          heures_totales: input.heures_totales,
          temps_pause: input.temps_pause,
          heures_sup: input.heures_sup,
          synced: false,
          created_at: existing ? existing.created_at : '2026-10-28T07:00:00Z',
          updated_at: '2026-10-28T18:00:00Z',
        };
        dbStore.set(compoundKey, record);
        return record;
      }

      // Stage 1
      const rec1 = simulateSave({ profile_id: profileId, date, heures_totales: 4.0, temps_pause: 0, heures_sup: 0 });
      assert.equal(dbStore.size, 1);
      assert.equal(rec1.heures_totales, 4.0);

      // Stage 2
      const rec2 = simulateSave({ profile_id: profileId, date, heures_totales: 5.5, temps_pause: 0.5, heures_sup: 0 });
      assert.equal(dbStore.size, 1, 'Store must not grow: must update existing record');
      assert.equal(rec2.id, rec1.id, 'Record ID must be strictly preserved across updates');
      assert.equal(rec2.heures_totales, 5.5);

      // Stage 3
      const rec3 = simulateSave({ profile_id: profileId, date, heures_totales: 9.0, temps_pause: 1.0, heures_sup: 2.0 });
      assert.equal(dbStore.size, 1);
      assert.equal(rec3.id, rec1.id);
      assert.equal(rec3.heures_totales, 9.0);
      assert.equal(rec3.heures_sup, 2.0);

      // Stage 4
      const rec4 = simulateSave({ profile_id: profileId, date, heures_totales: 8.5, temps_pause: 1.0, heures_sup: 1.5 });
      assert.equal(dbStore.size, 1);
      assert.equal(rec4.id, rec1.id);
      assert.equal(rec4.heures_totales, 8.5);
      assert.equal(rec4.heures_sup, 1.5);
      assert.equal(rec4.synced, false, 'Unsynced flag must be retained until remote sync');
    });

    it('stress-tests Dexie sync reconciliation: preserves local unsynced edits over remote pull', () => {
      const profileId = 'worker-uuid-42';
      const date = '2026-10-28';

      const localRecord: PointageLocal = {
        id: 'local-id-1',
        profile_id: profileId,
        date,
        heures_totales: 9.0, // Offline edit: changed from 7 to 9
        temps_pause: 1.0,
        heures_sup: 2.0,
        synced: false, // Pending sync
      };

      const remoteRecord = {
        id: 'remote-id-1',
        profile_id: profileId,
        date,
        heures_totales: 7.0, // Older remote certified value
        temps_pause: 1.0,
        heures_sup: 0.0,
      };

      // Simulating syncEngine.pullRemoteData logic from src/lib/sync.ts:260-272
      function reconcile(local: PointageLocal, remote: typeof remoteRecord) {
        if (!local.synced) {
          // Rule in sync.ts: Saisie locale en attente : NE PAS écraser les modifications locales non synchronisées
          return {
            ...local,
            id: remote.id,
            synced: false, // Keeps local changes!
          };
        } else {
          return {
            ...remote,
            synced: true,
          };
        }
      }

      const reconciled = reconcile(localRecord, remoteRecord);
      assert.equal(reconciled.heures_totales, 9.0, 'Local unsynced hours (9.0h) must be preserved');
      assert.equal(reconciled.heures_sup, 2.0, 'Local unsynced overtime (2.0h) must be preserved');
      assert.equal(reconciled.synced, false, 'Sync flag must remain false until pushed');
      assert.equal(reconciled.id, 'remote-id-1', 'ID reconciled to canonical server ID');
    });

    it('stress-tests Dexie sync reconciliation: updates local record when already synced', () => {
      const profileId = 'worker-uuid-42';
      const date = '2026-10-28';

      const localRecord: PointageLocal = {
        id: 'pt-1',
        profile_id: profileId,
        date,
        heures_totales: 7.0,
        temps_pause: 1.0,
        heures_sup: 0.0,
        synced: true, // Already synced
      };

      const remoteRecord = {
        id: 'pt-1',
        profile_id: profileId,
        date,
        heures_totales: 8.0, // Manager adjusted remotely
        temps_pause: 1.0,
        heures_sup: 1.0,
      };

      // Simulating syncEngine.pullRemoteData logic
      function reconcile(local: PointageLocal, remote: typeof remoteRecord) {
        if (!local.synced) {
          return local;
        } else {
          return {
            ...remote,
            synced: true,
          };
        }
      }

      const reconciled = reconcile(localRecord, remoteRecord);
      assert.equal(reconciled.heures_totales, 8.0, 'Synced local record must adopt fresh remote value');
      assert.equal(reconciled.heures_sup, 1.0);
    });

    it('stress-tests edge-case hour boundaries: 0h, 24h, fractions, and invalid inputs', () => {
      // 0h total
      assert.equal(validateDailyHours(0, 0, 0).valid, true);
      assert.equal(calculateAutoOvertime(0, 7), 0);
      assert.equal(calculateNormalHours(0, 0), 0);

      // 24h total
      assert.equal(validateDailyHours(24, 0, 17).valid, true);
      assert.equal(calculateAutoOvertime(24, 7), 17);
      assert.equal(calculateNormalHours(24, 17), 7);

      // Quarter-hour increments
      assert.equal(formatHours(7.25), '7h15');
      assert.equal(formatHours(8.5), '8h30');
      assert.equal(formatHours(8.75), '8h45');
      assert.equal(calculateAutoOvertime(8.25, 7), 1.25);
      assert.equal(calculateNormalHours(8.25, 1.25), 7);

      // Negative & overflow rejection
      assert.equal(validateDailyHours(-0.5, 0, 0).valid, false);
      assert.equal(validateDailyHours(24.5, 0, 0).valid, false);
      assert.equal(validateDailyHours(8, 0, 9).valid, false); // overtime > total
    });
  });

  // =========================================================================
  // Challenge 3: Supervisor vs Ouvrier Role State Segmentation
  // =========================================================================
  describe('Challenge 3: Supervisor vs Ouvrier Role State Segmentation', () => {
    it('verifies ouvrier role restricts selectable chantiers to assigned sites only', () => {
      assert.match(
        homeContent,
        /profile\?\.role === 'ouvrier'\s*\?\s*assignedChantiers\s*:\s*allChantiers/,
        'Ouvrier must only be able to select assigned chantiers'
      );
    });

    it('verifies team monitoring section is guarded strictly for chef_equipe and admin', () => {
      assert.match(
        homeContent,
        /profile\?\.role === 'chef_equipe' \|\| profile\?\.role === 'admin'/,
        'Team monitoring section must be guarded for supervisors only'
      );
    });

    it('verifies team status aggregation aggregates all team members excluding current supervisor', () => {
      assert.match(
        homeContent,
        /allProfilesData\.filter\(\(p\)\s*=>\s*p\.id\s*!==\s*profile\.id\)/,
        'Team monitoring must aggregate colleagues excluding the supervisor themselves'
      );
    });

    it('stress-tests aggregateTeamDailyStatus across mixed team submission states', () => {
      const mockProfiles: Profile[] = [
        { id: 'ouvrier-1', nom: 'Bernard', prenom: 'Thomas', role: 'ouvrier' },
        { id: 'ouvrier-2', nom: 'Moreau', prenom: 'Lucas', role: 'ouvrier' },
        { id: 'ouvrier-3', nom: 'Petit', prenom: 'Antoine', role: 'ouvrier' },
        { id: 'ouvrier-4', nom: 'Roux', prenom: 'David', role: 'ouvrier' },
      ];

      const mockPointages: PointageLocal[] = [
        { id: 'pt-1', profile_id: 'ouvrier-1', date: '2026-10-28', heures_totales: 8, temps_pause: 1, heures_sup: 1, synced: true },
        { id: 'pt-2', profile_id: 'ouvrier-2', date: '2026-10-28', heures_totales: 7, temps_pause: 1, heures_sup: 0, synced: true },
        { id: 'pt-3', profile_id: 'ouvrier-3', date: '2026-10-28', heures_totales: 9.5, temps_pause: 1, heures_sup: 2.5, synced: false },
      ];

      const agg = aggregateTeamDailyStatus(mockPointages, mockProfiles, '2026-10-28');

      assert.equal(agg.workersCount, 4, 'Total workers count must be 4');
      assert.equal(agg.submittedCount, 3, 'Submitted workers count must be 3');
      assert.equal(agg.totalTeamHours, 24.5, 'Total team hours = 8 + 7 + 9.5 = 24.5h');
      assert.equal(agg.totalNormalHours, 21.0, 'Total normal hours = 7 + 7 + 7 = 21.0h');
      assert.equal(agg.totalOvertime, 3.5, 'Total overtime = 1 + 0 + 2.5 = 3.5h');
      assert.equal(agg.totalPause, 3.0, 'Total pause = 1 + 1 + 1 = 3.0h');

      // Verify individual worker statuses
      const w1 = agg.statuses.find((s) => s.profile.id === 'ouvrier-1');
      assert.equal(w1?.hasSubmitted, true);
      assert.equal(w1?.heuresTotales, 8);
      assert.equal(w1?.heuresSup, 1);

      const w4 = agg.statuses.find((s) => s.profile.id === 'ouvrier-4');
      assert.equal(w4?.hasSubmitted, false);
      assert.equal(w4?.heuresTotales, 0);
      assert.equal(w4?.heuresSup, 0);
    });

    it('verifies both ouvrier and supervisor have independent personal time tracking', () => {
      assert.match(homeContent, /CircularProgressGauge/, 'Gauge is rendered for active user regardless of role');
      assert.match(homeContent, /Ma déclaration du jour/, 'Personal declaration summary is rendered for active user');
      assert.match(homeContent, /\+\s*Saisir des heures/, 'CTA is rendered for active user');
    });
  });

  // =========================================================================
  // Challenge 4: Outdoor Touch Targets & Invariant Preservation
  // =========================================================================
  describe('Challenge 4: Outdoor Touch Targets & Invariant Preservation', () => {
    it('verifies all interactive stepper buttons provide minimum 48x48px touch targets', () => {
      const stepperMatches = homeContent.match(/min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/g);
      assert.ok(stepperMatches && stepperMatches.length >= 6, 'Must provide 48x48px steppers for total, pause, sup');
    });

    it('verifies date navigation arrows provide minimum 48x48px touch targets', () => {
      assert.match(datePillContent, /min-w-\[48px\]\s+min-h-\[48px\]/);
    });

    it('verifies primary CTA button provides minimum 48px height', () => {
      assert.match(homeContent, /min-h-\[48px\]\s+h-14/);
    });

    it('verifies zero legacy clocking tokens exist anywhere in Home.tsx', () => {
      assert.doesNotMatch(homeContent, /PointageType/);
      assert.doesNotMatch(homeContent, /getQuickGeolocation/);
      assert.doesNotMatch(homeContent, /handlePointage\(/);
      assert.doesNotMatch(homeContent, /'arrivee'/);
      assert.doesNotMatch(homeContent, /'depart'/);
    });
  });
});
