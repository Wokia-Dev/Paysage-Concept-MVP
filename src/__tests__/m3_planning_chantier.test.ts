import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Milestone 3: Planning & Fiche Chantier Visual Redesign (R5)', () => {
  const planningPath = resolve(projectRoot, 'src/pages/Planning.tsx');
  const chantierDetailPath = resolve(projectRoot, 'src/pages/ChantierDetail.tsx');

  const planningContent = readFileSync(planningPath, 'utf-8');
  const chantierDetailContent = readFileSync(chantierDetailPath, 'utf-8');

  describe('Planning View Redesign (R5 - Planning.tsx)', () => {
    it('declares 3-state period toggle supporting Jour, Semaine, and Mois', () => {
      // Must support day, week, month states
      assert.match(
        planningContent,
        /type\s+ViewMode\s*=\s*['"]day['"]\s*\|\s*['"]week['"]\s*\|\s*['"]month['"]/i,
        'Planning must define ViewMode supporting day, week, and month'
      );
      assert.match(planningContent, />\s*Jour\s*<\/button>/, 'Planning must render Jour toggle button');
      assert.match(planningContent, />\s*Semaine\s*<\/button>/, 'Planning must render Semaine toggle button');
      assert.match(planningContent, />\s*Mois\s*<\/button>/, 'Planning must render Mois toggle button');
    });

    it('implements month grid calendar view alongside day and week views', () => {
      assert.match(
        planningContent,
        /viewMode\s*===\s*['"]month['"]/,
        'Planning must conditionally render month view'
      );
      assert.match(
        planningContent,
        /monthGridDays|currentMonthDate/,
        'Planning must calculate month calendar days grid'
      );
      assert.match(
        planningContent,
        /grid-cols-7/,
        'Month view must render 7-column calendar grid (Lun-Dim)'
      );
    });

    it('focuses day schedule on assigned chantiers and teammates without granular timeline clutter', () => {
      assert.doesNotMatch(
        planningContent,
        /07:45 - 08:00/,
        'Planning day schedule must remove granular timeline step 07:45 - 08:00'
      );
      assert.doesNotMatch(
        planningContent,
        /Pause déjeuner sur site/,
        'Planning day schedule must remove lunch break timeline step'
      );
      assert.match(
        planningContent,
        /Consulter la fiche détaillée/,
        'Planning must render direct link to Consulter la fiche détaillée'
      );
    });

    it('verifies team presence card is removed per design simplification', () => {
      assert.doesNotMatch(
        planningContent,
        /présents sur le terrain/i,
        'Planning must remove team presence summary card'
      );
      assert.doesNotMatch(
        planningContent,
        /PRÉSENCE ÉQUIPE SUR LE TERRAIN/i,
        'Planning must remove team presence heading'
      );
    });

    it('renders dedicated "Aujourd\'hui" button next to navigation controls', () => {
      assert.match(
        planningContent,
        />\s*Aujourd'hui\s*<\/button>/,
        'Planning must render dedicated "Aujourd\'hui" button'
      );
    });

    it('synchronizes week strip and selected date across date selections', () => {
      assert.match(
        planningContent,
        /currentWeekMonday|selectedDateObj/,
        'Planning must anchor week strip directly to selectedDate'
      );
    });

    it('provides quick contact modal with Message and Téléphone actions for team members', () => {
      assert.match(
        planningContent,
        /contactMember/,
        'Planning must track selected contact member for quick actions'
      );
      assert.match(
        planningContent,
        /href=\{`tel:/,
        'Quick contact modal must provide direct tel: link'
      );
      assert.match(
        planningContent,
        /href=\{`sms:/,
        'Quick contact modal must provide direct link to sms'
      );
      assert.match(
        planningContent,
        />\s*Message\s*</,
        'Quick contact modal must have Message button'
      );
      assert.match(
        planningContent,
        />\s*Téléphone\s*</,
        'Quick contact modal must have Téléphone button'
      );
    });

    it('verifies orange security consignes card and time badge are removed per design simplification', () => {
      assert.doesNotMatch(
        planningContent,
        /Consignes d'intervention|Consignes journali/i,
        'Planning must not render orange security consignes card'
      );
      assert.doesNotMatch(
        planningContent,
        /formattedCurrentTime/,
        'Planning must not render clock time badge'
      );
    });

    it('enforces outdoor touch ergonomics with minimum 48x48px boundaries on controls', () => {
      assert.match(
        planningContent,
        /min-h-\[48px\]/,
        'Planning interactive controls must enforce min 48px height'
      );
      assert.match(
        planningContent,
        /min-w-\[48px\]/,
        'Planning navigation controls must enforce min 48px width'
      );
    });
  });

  describe('Fiche Chantier View Redesign (R5 - ChantierDetail.tsx)', () => {
    it('strictly enforces typographic layout without photo banners, gallery grids, or file uploads', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<input[^>]+type=["']file["']/i,
        'Job site file upload inputs are deferred and strictly prohibited'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /useCamera|capturePhoto/i,
        'Camera capture functions are deferred and strictly prohibited'
      );
    });

    it('displays client name in bold Forest Green with "Chantier : [Client]" pattern', () => {
      assert.match(
        chantierDetailContent,
        /Chantier\s*:\s*\{chantier\.nom_client\}/,
        'Client name must follow "Chantier : [Client]" layout pattern'
      );
      assert.match(
        chantierDetailContent,
        /text-foret/,
        'Client title must use Forest Green brand token'
      );
    });

    it('provides formatted address and direct Google Maps GPS navigation link', () => {
      assert.match(
        chantierDetailContent,
        /maps\.google\.com\/\?q=/i,
        'ChantierDetail must provide direct Google Maps navigation link'
      );
      assert.match(
        chantierDetailContent,
        /chantier\.adresse/,
        'ChantierDetail must render formatted job site address'
      );
    });

    it('implements floating circular action buttons with 48x48px boundaries', () => {
      assert.match(
        chantierDetailContent,
        /rounded-full.*?min-w-\[48px\].*?min-h-\[48px\]|min-w-\[48px\].*?min-h-\[48px\].*?rounded-full/,
        'Action buttons (Back and GPS) must be circular with min 48x48px touch boundaries'
      );
    });

    it('renders Équipe section with horizontal avatar row and green presence indicators', () => {
      assert.match(
        chantierDetailContent,
        /Équipe sur le chantier/i,
        'ChantierDetail must render Équipe section'
      );
      assert.match(
        chantierDetailContent,
        /(bg-emerald-500.*?rounded-full|rounded-full.*?bg-emerald-500)/,
        'Team avatars must include green presence indicator dots'
      );
    });

    it('renders Documents section with Terracotta PDF badge cards', () => {
      assert.match(
        chantierDetailContent,
        /Plan d'aménagement\.pdf/,
        'Documents section must include Plan d\'aménagement.pdf card'
      );
      assert.match(
        chantierDetailContent,
        /Devis signé\.pdf/,
        'Documents section must include Devis signé.pdf card'
      );
      assert.match(
        chantierDetailContent,
        /bg-terracotta/,
        'Documents section must feature Terracotta PDF badge icon'
      );
    });

    it('renders simple placeholder card for future photo uploads (Phase 2)', () => {
      assert.match(
        chantierDetailContent,
        /Photos du chantier/i,
        'ChantierDetail must render Photos section'
      );
      assert.match(
        chantierDetailContent,
        /Phase 2/i,
        'Photos section must display Phase 2 placeholder notice'
      );
    });

    it('verifies team discussion card is removed and direct team member SMS action is provided', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /Discussion d'équipe du chantier/i,
        'Team discussion card must be removed from ChantierDetail'
      );
      assert.match(
        chantierDetailContent,
        /<a[\s\S]*?href=\{`sms:\$\{member\.telephone[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
        'ChantierDetail must provide direct sms link with min 48px touch targets for team members'
      );
    });

    it('preserves supervisor status management and worker assignment controls', () => {
      assert.match(
        chantierDetailContent,
        /isSupervisor/,
        'ChantierDetail must check supervisor role'
      );
      assert.match(
        chantierDetailContent,
        /handleStatutChange/,
        'ChantierDetail must preserve status update handler'
      );
      assert.match(
        chantierDetailContent,
        /handleToggleWorker/,
        'ChantierDetail must preserve worker assignment toggle'
      );
    });
  });
});
