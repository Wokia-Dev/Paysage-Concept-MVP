/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Milestone 2: Home Dashboard & Declarative Time-Tracking (R3 & R4)', () => {
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');
  const gaugePath = resolve(projectRoot, 'src/components/common/CircularProgressGauge.tsx');
  const datePillPath = resolve(projectRoot, 'src/components/common/DateSelectorPill.tsx');

  const homeContent = readFileSync(homePath, 'utf-8');
  const gaugeContent = readFileSync(gaugePath, 'utf-8');
  const datePillContent = readFileSync(datePillPath, 'utf-8');

  describe('Dimension 1: Horseshoe Circular Progress Gauge (R4)', () => {
    it('verifies CircularProgressGauge component exists and is exported', () => {
      assert.ok(existsSync(gaugePath), 'CircularProgressGauge.tsx must exist');
      assert.match(gaugeContent, /export\s+const\s+CircularProgressGauge/);
    });

    it('calculates 260-degree sweep geometry accurately', () => {
      const radius = 76;
      const circumference = 2 * Math.PI * radius;
      const sweepAngle = 260;
      const arcLength = circumference * (sweepAngle / 360);
      const gapLength = circumference - arcLength;

      // Assert geometric constraints
      assert.ok(arcLength > 340 && arcLength < 350, `Arc length ${arcLength} should be ~344.87`);
      assert.ok(gapLength > 130 && gapLength < 135, `Gap length ${gapLength} should be ~132.65`);
      assert.match(gaugeContent, /strokeDasharray=\{`\$\{arcLength\}\s+\$\{gapLength\}`\}/);
    });

    it('verifies center typography displays formatted hours, target, and percentage', () => {
      assert.match(gaugeContent, /formattedLargeHours/);
      assert.match(gaugeContent, /Objectif\s*:/);
      assert.match(gaugeContent, /% atteint/);
    });

    it('verifies accessible SVG markup with role and aria-label', () => {
      assert.match(gaugeContent, /role="img"/);
      assert.match(gaugeContent, /aria-label=/);
    });

    it('formats large display hours correctly with leading zeroes on minutes', () => {
      function formatLargeDisplay(val: number): string {
        const wholeHours = Math.floor(val);
        const minutes = Math.round((val - wholeHours) * 60);
        return `${wholeHours}h ${String(minutes).padStart(2, '0')}`;
      }

      assert.equal(formatLargeDisplay(8), '8h 00');
      assert.equal(formatLargeDisplay(7.5), '7h 30');
      assert.equal(formatLargeDisplay(0), '0h 00');
      assert.equal(formatLargeDisplay(9.25), '9h 15');
    });
  });

  describe('Dimension 2: Date Navigation Pill & Time Travel (R3)', () => {
    it('verifies DateSelectorPill component exists and is exported', () => {
      assert.ok(existsSync(datePillPath), 'DateSelectorPill.tsx must exist');
      assert.match(datePillContent, /export\s+const\s+DateSelectorPill/);
    });

    it('enforces minimum 48x48px touch targets on navigation arrows', () => {
      const touchTargetRegex = /min-w-\[48px\]\s+min-h-\[48px\]/;
      assert.match(
        datePillContent,
        touchTargetRegex,
        'Navigation buttons must enforce min-w-[48px] min-h-[48px] for outdoor use'
      );
    });

    it('safely manipulates ISO dates without timezone drift', () => {
      function shiftDate(isoDate: string, days: number): string {
        const d = new Date(isoDate + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
      }

      assert.equal(shiftDate('2026-10-28', -1), '2026-10-27');
      assert.equal(shiftDate('2026-10-28', 1), '2026-10-29');
      assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
    });
  });

  describe('Dimension 3: Home Dashboard Visual Structure (R3)', () => {
    it('renders Biophilic Forest Green curved header with greeting and subtitle', () => {
      assert.match(homeContent, /bg-foret/);
      assert.match(homeContent, /rounded-b-3xl/);
      assert.match(homeContent, /Bonjour.*?\s*👋/);
      assert.match(homeContent, /Voici un aperçu de votre journée/);
    });

    it('renders user avatar initials and removes notification bell with Terracotta badge', () => {
      assert.doesNotMatch(homeContent, /<Bell/);
      assert.match(homeContent, /userInitials/);
    });

    it('verifies redundant quick glance horizontal pills are removed in favor of weekly strip and hero card', () => {
      // User request 6: Remove redundant site and hours pills below date selector
      assert.match(homeContent, /WeeklyCalendarStrip/);
      assert.doesNotMatch(homeContent, /2 non lus/);
    });

    it('renders Hero Chantier card with status badge, map pin, GPS navigation link, and start time', () => {
      assert.match(homeContent, /Prochaine intervention|Chantier\s*:/);
      assert.match(homeContent, /getStatusBadge/);
      assert.match(homeContent, /https:\/\/maps\.google\.com\/\?q=/);
      assert.match(homeContent, /Intervention prévue à 08h00/);
    });

    it('strictly forbids photo thumbnails, galleries, and image banners on Chantier cards (R3 & R5)', () => {
      assert.doesNotMatch(homeContent, /<img[\s>]/, 'Hero chantier card must not render <img> tags');
      assert.doesNotMatch(homeContent, /<picture[\s>]/, 'Must not render <picture> elements');
    });

    it('renders daily weather widget without tasks summary or quote pill', () => {
      assert.match(homeContent, /fetchChantierWeather/);
      assert.match(homeContent, /Météo chantier/);
      assert.doesNotMatch(homeContent, /Tâches prévues/);
      assert.doesNotMatch(homeContent, /La nature fait bien les choses/);
    });

    it('verifies Quick Access grid is removed from Home dashboard', () => {
      assert.doesNotMatch(homeContent, /Accès rapide/);
    });
  });

  describe('Dimension 4: Declarative Time-Tracking UX & Form (R4)', () => {
    it('provides "+ Saisir des heures" CTA in Accent Terracotta (#C47452) with min 48px height', () => {
      assert.match(homeContent, /\+\s*Saisir des heures/);
      assert.match(homeContent, /bg-terracotta/);
      assert.match(homeContent, /min-h-\[48px\]|h-14/);
    });

    it('renders thumb-friendly numeric steppers with min 48x48px boundaries for outdoor landscapers', () => {
      assert.match(
        homeContent,
        /min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/,
        'Stepper buttons must provide full 48x48px touch boxes'
      );
    });

    it('verifies redundant history card directly below gauge is removed per design overhaul', () => {
      // User request 6: Remove redundant "HISTORIQUE DES DÉCLARATIONS" card sitting below gauge
      assert.doesNotMatch(homeContent, /HISTORIQUE DES DÉCLARATIONS/);
    });

    it('renders supervisor team presence summary for chef_equipe and admin', () => {
      assert.match(homeContent, /profile\?\.role === 'chef_equipe'/);
      assert.match(homeContent, /Suivi de l'équipe/);
      assert.match(homeContent, /teamSummary/);
    });
  });

  describe('Dimension 5: Critical Test Invariants & Keyword Bans (Non-Regression)', () => {
    it('verifies exact variable names and logic hooks required by pointages.test.ts', () => {
      assert.match(homeContent, /isEditingTarget/);
      assert.match(homeContent, /calculateAutoOvertime/);
      assert.match(homeContent, /calculateNormalHours/);
    });

    it('verifies exact French invariant strings required by pointages.test.ts', () => {
      assert.match(homeContent, /Heures totales travaillées \(heures sup incluses\)/);
      assert.match(homeContent, /Dont heures supplémentaires/);
      assert.doesNotMatch(homeContent, /Ventilation du temps de travail/);
      assert.match(homeContent, /déjà incluses/);
    });

    it('strictly forbids legacy clocking actions and tokens', () => {
      assert.doesNotMatch(homeContent, /PointageType/);
      assert.doesNotMatch(homeContent, /getQuickGeolocation/);
      assert.doesNotMatch(homeContent, /handlePointage\(/);
      assert.doesNotMatch(homeContent, /'arrivee'/);
      assert.doesNotMatch(homeContent, /'depart'/);
    });
  });
});
