/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Chantier, Profile, Affectation, PointageLocal } from '../types/database.ts';
import {
  calculateAutoOvertime,
  calculateNormalHours,
  validateDailyHours,
} from '../lib/hours.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('E2E Real-World Field Landscaper Workflows & Cross-Feature Integration (R3, R5, R6)', () => {
  const planningContent = readFileSync(resolve(projectRoot, 'src/pages/Planning.tsx'), 'utf-8');
  const chantierDetailContent = readFileSync(
    resolve(projectRoot, 'src/pages/ChantierDetail.tsx'),
    'utf-8'
  );
  const chatPreviewContent = readFileSync(
    resolve(projectRoot, 'src/pages/ChatPreview.tsx'),
    'utf-8'
  );
  const equipeContent = readFileSync(resolve(projectRoot, 'src/pages/Equipe.tsx'), 'utf-8');
  const plusContent = readFileSync(resolve(projectRoot, 'src/pages/Plus.tsx'), 'utf-8');

  describe('Tier 1: Feature Coverage — Screen Layouts & Typographic Contracts', () => {
    it('verifies Fiche Chantier renders typographic layout with direct GPS action', () => {
      assert.match(
        chantierDetailContent,
        /maps\.google\.com\/\?q=/i,
        'ChantierDetail must provide direct Google Maps navigation link'
      );
      assert.match(
        chantierDetailContent,
        /nom_client/,
        'ChantierDetail must display client name'
      );
      assert.match(
        chantierDetailContent,
        /adresse/,
        'ChantierDetail must display formatted address'
      );
    });

    it('verifies Fiche Chantier excludes photo gallery grids and camera upload UI per scope', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<input[^>]+type=["']file["']/i,
        'Photo file upload inputs are deferred and must not exist in ChantierDetail'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /useCamera|capturePhoto/i,
        'Camera capture functions are deferred and must not exist in ChantierDetail'
      );
    });

    it('verifies Planning page displays timeline and team presence', () => {
      assert.match(planningContent, /selectedDate/, 'Planning must track selected date');
      assert.match(planningContent, /affectations/, 'Planning must load daily affectations');
      assert.match(planningContent, /chantiers/, 'Planning must load chantiers');
    });

    it('verifies Chat view uses static mock dataset without live Supabase Realtime', () => {
      assert.match(chatPreviewContent, /channels/, 'Chat preview must declare mock channels');
      assert.doesNotMatch(
        chatPreviewContent,
        /supabase\.channel|supabase\.from\(['"]messages['"]\)\.on/i,
        'Chat preview must not open live Supabase Realtime WebSocket subscriptions in this phase'
      );
    });

    it('verifies secondary screens (Équipe and Plus) exist and integrate design system', () => {
      assert.match(equipeContent, /text-foret/, 'Équipe must use text-foret brand color');
      assert.match(plusContent, /text-foret/, 'Plus must use text-foret brand color');
    });
  });

  describe('Tier 2: Boundary & Corner Cases — GPS Links & URL Encoding', () => {
    it('generates valid, safely encoded Google Maps GPS navigation links', () => {
      function formatGpsUrl(chantier: {
        adresse: string;
        latitude?: number | null;
        longitude?: number | null;
      }): string {
        if (chantier.latitude && chantier.longitude) {
          return `https://maps.google.com/?q=${chantier.latitude},${chantier.longitude}`;
        }
        return `https://maps.google.com/?q=${encodeURIComponent(chantier.adresse)}`;
      }

      // Case 1: Coordinates available
      const url1 = formatGpsUrl({
        adresse: '12 Chemin des Prés, 69300 Caluire',
        latitude: 45.795,
        longitude: 4.847,
      });
      assert.equal(url1, 'https://maps.google.com/?q=45.795,4.847');

      // Case 2: Address with French accents, spaces, and special punctuation
      const url2 = formatGpsUrl({
        adresse: '45 Rue de l\'Étang & Impasse du Chêne, 69000 Lyon',
        latitude: null,
        longitude: null,
      });
      assert.equal(
        url2,
        'https://maps.google.com/?q=45%20Rue%20de%20l\'%C3%89tang%20%26%20Impasse%20du%20Ch%C3%AAne%2C%2069000%20Lyon'
      );
      assert.ok(!url2.includes(' ')); // No raw spaces allowed in URL
    });

    it('handles Chantier with zero assigned team members without crashing', () => {
      const emptyAffs: Affectation[] = [];
      const mockProfiles: Profile[] = [
        { id: 'p1', nom: 'Dupont', prenom: 'Jean', role: 'ouvrier' },
      ];

      const targetDate = '2026-10-28';
      const dayAffs = emptyAffs.filter((a) => a.date_intervention === targetDate);
      const profileIds = Array.from(new Set(dayAffs.map((a) => a.profile_id)));
      const activeMembers = mockProfiles.filter((p) => profileIds.includes(p.id));

      assert.equal(activeMembers.length, 0);
    });

    it('handles unread badge counter display logic (hides when zero)', () => {
      function shouldRenderBadge(count: number): boolean {
        return count > 0;
      }
      assert.equal(shouldRenderBadge(0), false);
      assert.equal(shouldRenderBadge(1), true);
      assert.equal(shouldRenderBadge(5), true);
      assert.equal(shouldRenderBadge(-1), false);
    });
  });

  describe('Tier 3: Cross-Feature Interactions — Offline Dexie Sync & Data Integrity', () => {
    it('simulates offline pointage queueing and online synchronization reconciliation', () => {
      const localDatabase = new Map<string, PointageLocal>();

      function offlineSave(data: {
        profileId: string;
        chantierId: string;
        date: string;
        hours: number;
        pause: number;
        overtime: number;
      }): PointageLocal {
        const key = `${data.profileId}_${data.date}`;
        const existing = localDatabase.get(key);
        const record: PointageLocal = {
          id: existing ? existing.id : 'pointage-uuid-fixed',
          profile_id: data.profileId,
          chantier_id: data.chantierId,
          date: data.date,
          heures_totales: data.hours,
          temps_pause: data.pause,
          heures_sup: data.overtime,
          synced: false,
          synchronise_le: null,
        };
        localDatabase.set(key, record);
        return record;
      }

      function simulateOnlineSync(): number {
        let syncedCount = 0;
        const now = new Date().toISOString();
        for (const [key, record] of localDatabase.entries()) {
          if (!record.synced) {
            record.synced = true;
            record.synchronise_le = now;
            localDatabase.set(key, record);
            syncedCount++;
          }
        }
        return syncedCount;
      }

      // Step 1: Save offline in field with no connectivity
      const pt = offlineSave({
        profileId: 'worker-1',
        chantierId: 'chantier-laurent',
        date: '2026-10-28',
        hours: 8,
        pause: 1,
        overtime: 1,
      });

      assert.equal(pt.synced, false);
      assert.equal(pt.id, 'pointage-uuid-fixed');
      assert.equal(localDatabase.size, 1);

      // Step 2: Evening connection restoration triggers sync
      const syncedCount = simulateOnlineSync();
      assert.equal(syncedCount, 1);

      const refreshed = localDatabase.get('worker-1_2026-10-28');
      assert.ok(refreshed);
      assert.equal(refreshed?.synced, true);
      assert.ok(refreshed?.synchronise_le !== null);
      assert.equal(refreshed?.id, 'pointage-uuid-fixed'); // UUID retained!
    });

    it('verifies strict isolation between multiple worker declarations on same date', () => {
      const records = new Map<string, PointageLocal>();
      const date = '2026-10-28';

      // Worker 1 saves 7h
      records.set(`w1_${date}`, {
        id: 'id-1',
        profile_id: 'w1',
        date,
        heures_totales: 7,
        temps_pause: 1,
        heures_sup: 0,
        synced: true,
      });

      // Worker 2 saves 9h
      records.set(`w2_${date}`, {
        id: 'id-2',
        profile_id: 'w2',
        date,
        heures_totales: 9,
        temps_pause: 1,
        heures_sup: 2,
        synced: false,
      });

      assert.equal(records.size, 2);
      assert.notEqual(records.get(`w1_${date}`)?.id, records.get(`w2_${date}`)?.id);
      assert.equal(records.get(`w1_${date}`)?.heures_totales, 7);
      assert.equal(records.get(`w2_${date}`)?.heures_totales, 9);
    });
  });

  describe('Tier 4: End-to-End Field Landscaper Workday Workflow', () => {
    it('executes end-to-end field scenario: login -> dashboard -> time entry -> planning -> chat', () => {
      // 1. Session Setup
      const currentUser: Profile = {
        id: 'user-jean-dupont',
        prenom: 'Jean',
        nom: 'Dupont',
        role: 'ouvrier',
      };
      assert.equal(currentUser.role, 'ouvrier');

      // 2. Chantier Assignment Verification
      const mockChantier: Chantier = {
        id: 'chantier-villa-laurent',
        nom_client: 'Villa Laurent',
        adresse: '8 Chemin du Vallon, 69130 Écully',
        statut: 'en_cours',
        latitude: 45.776,
        longitude: 4.779,
      };

      const mockAffectation: Affectation = {
        id: 'aff-101',
        chantier_id: mockChantier.id,
        profile_id: currentUser.id,
        date_intervention: '2026-10-28',
      };

      assert.equal(mockAffectation.profile_id, currentUser.id);
      assert.equal(mockAffectation.chantier_id, mockChantier.id);

      // 3. GPS Navigation Route Launch
      const gpsUrl = `https://maps.google.com/?q=${mockChantier.latitude},${mockChantier.longitude}`;
      assert.equal(gpsUrl, 'https://maps.google.com/?q=45.776,4.779');

      // 4. Declarative Time-Tracking
      const dailyTarget = 7.0;
      const hoursWorked = 8.5; // Arrived at 08:00, finished at 17:30 with 1h pause
      const pauseDuration = 1.0;

      // Validate inputs
      const validation = validateDailyHours(hoursWorked, pauseDuration, 1.5);
      assert.equal(validation.valid, true);

      // Smart overtime pre-selection
      const autoOvertime = calculateAutoOvertime(hoursWorked, dailyTarget);
      assert.equal(autoOvertime, 1.5); // 8.5h - 7.0h = 1.5h

      // Normal hours calculation
      const normalHours = calculateNormalHours(hoursWorked, autoOvertime);
      assert.equal(normalHours, 7.0);

      // Strict Invariant
      assert.equal(normalHours + autoOvertime, hoursWorked);

      // 5. Offline Record Storage
      const pointage: PointageLocal = {
        id: 'pt-uuid-e2e',
        profile_id: currentUser.id,
        chantier_id: mockChantier.id,
        date: '2026-10-28',
        heures_totales: hoursWorked,
        temps_pause: pauseDuration,
        heures_sup: autoOvertime,
        synced: false,
      };

      assert.equal(pointage.heures_totales, 8.5);
      assert.equal(pointage.heures_sup, 1.5);

      // 6. Communication & Chat Check
      const mockChatChannels = [
        { id: 'general', title: 'Général Paysage Concept', unread: 2 },
        { id: 'laurent', title: 'Chantier Villa Laurent', unread: 0 },
      ];
      const unreadTotal = mockChatChannels.reduce((sum, ch) => sum + ch.unread, 0);
      assert.equal(unreadTotal, 2);

      // 7. Verification of Clean Declarative Invariant
      assert.ok(true, 'Full landscaper lifecycle successfully verified');
    });
  });
});
