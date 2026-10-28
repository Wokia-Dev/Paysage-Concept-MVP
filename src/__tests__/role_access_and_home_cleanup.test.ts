/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Home Page UI Cleanup & Role-Based Access Restriction', () => {
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');
  const chantiersPath = resolve(projectRoot, 'src/pages/Chantiers.tsx');
  const chantierDetailPath = resolve(projectRoot, 'src/pages/ChantierDetail.tsx');
  const plusPath = resolve(projectRoot, 'src/pages/Plus.tsx');
  const appPath = resolve(projectRoot, 'src/App.tsx');

  const homeContent = readFileSync(homePath, 'utf-8');
  const chantiersContent = readFileSync(chantiersPath, 'utf-8');
  const chantierDetailContent = readFileSync(chantierDetailPath, 'utf-8');
  const plusContent = readFileSync(plusPath, 'utf-8');
  const appContent = readFileSync(appPath, 'utf-8');

  describe('1. Home Page UI Simplification', () => {
    it('strictly removes "Tâches prévues" badge/widget', () => {
      assert.doesNotMatch(homeContent, /Tâches prévues/i, 'Home must not render Tâches prévues widget');
      assert.doesNotMatch(homeContent, /CheckSquare/i, 'Home must not import or render CheckSquare icon');
    });

    it('strictly removes "Esprit paysage" quote section', () => {
      assert.doesNotMatch(homeContent, /Esprit paysage/i, 'Home must not render Esprit paysage quote section');
      assert.doesNotMatch(homeContent, /La nature fait bien les choses/i, 'Home must not render nature quote');
      assert.doesNotMatch(homeContent, /Leaf/i, 'Home must not import or render Leaf icon');
    });

    it('strictly removes top notification bell icon and unread message count badges', () => {
      assert.doesNotMatch(homeContent, /<Bell/i, 'Home must not render Bell icon');
      assert.doesNotMatch(homeContent, /2 non lus/i, 'Home must not render unread count badge');
    });

    it('strictly removes "Accès rapide" (Quick Access) grid section', () => {
      assert.doesNotMatch(homeContent, /Accès rapide/i, 'Home must not render Accès rapide grid');
    });

    it('strictly removes "Ventilation du temps de travail" card from Home page', () => {
      assert.doesNotMatch(homeContent, /Ventilation du temps de travail/i, 'Home must not render work hours breakdown card');
      assert.doesNotMatch(homeContent, /\bScale\b/, 'Home must not import or render Scale icon');
    });

    it('preserves clean vertical layout and required elements on Home page', () => {
      // Forest green curved header
      assert.match(homeContent, /bg-foret/);
      assert.match(homeContent, /Bonjour.*?\s*👋/);

      // Date selector pill
      assert.match(homeContent, /DateSelectorPill/);

      // Weather widget (full width)
      assert.match(homeContent, /Météo chantier/);
      assert.match(homeContent, /fetchChantierWeather/);

      // Circular progress gauge & daily declarative hours form
      assert.match(homeContent, /CircularProgressGauge/);
      assert.match(homeContent, /Suivi des heures/);
      assert.match(homeContent, /Heures totales travaillées \(heures sup incluses\)/);
      assert.match(homeContent, /Dont heures supplémentaires/);
      assert.match(homeContent, /déjà incluses/);
    });
  });

  describe('2. Role-Based Access for Job Sites (Chantiers)', () => {
    it('restricts global Chantiers route in App.tsx to supervisors with SupervisorRoute', () => {
      assert.match(appContent, /function SupervisorRoute/);
      assert.match(appContent, /profile\?\.role === 'ouvrier'/);
      assert.match(appContent, /<SupervisorRoute>[\s\S]*?<Chantiers \/>[\s\S]*?<\/SupervisorRoute>/);
    });

    it('enforces role check in Chantiers.tsx redirecting ouvrier to root', () => {
      assert.match(chantiersContent, /profile\?\.role === 'ouvrier'/);
      assert.match(chantiersContent, /<Navigate to="\/" replace \/>/);
    });

    it('restricts ChantierDetail.tsx to assigned worker or supervisors', () => {
      assert.match(chantierDetailContent, /isSupervisor/);
      assert.match(chantierDetailContent, /isAssignedWorker/);
      assert.match(chantierDetailContent, /Accès restreint/);
      assert.match(chantierDetailContent, /Vous n'êtes pas affecté à ce chantier/);
    });

    it('ensures Home.tsx restricts selectable and hero chantiers for ouvrier strictly to their assignments', () => {
      assert.match(homeContent, /availableChantiers = profile\?\.role === 'ouvrier' \? assignedChantiers : allChantiers/);
      assert.match(homeContent, /profile\?\.role === 'ouvrier' \? null : allChantiers\[0\]/);
    });

    it('only presents Chantiers catalog management link in Plus.tsx to chef_equipe and admin', () => {
      assert.match(plusContent, /profile\?\.role === 'chef_equipe' \|\| profile\?\.role === 'admin'/);
      assert.match(plusContent, /to="\/chantiers"/);
      assert.match(plusContent, /Catalogue des chantiers/);
    });

    it('renders dedicated job site management shortcut on Home page exclusively for supervisors', () => {
      // Must be conditioned on chef_equipe or admin
      assert.match(
        homeContent,
        /\(profile\?\.role === 'chef_equipe' \|\| profile\?\.role === 'admin'\)\s*&&[\s\S]*?<Link[\s\S]*?to="\/chantiers"/,
        'Home page shortcut must be strictly visible only to chef_equipe or admin'
      );

      // Must be positioned between the hero chantier section and "Suivi des heures"
      assert.match(
        homeContent,
        /Prochaine intervention[\s\S]*?to="\/chantiers"[\s\S]*?Suivi des heures/,
        'Shortcut must be positioned directly below the job site card and above Suivi des heures'
      );

      // Must enforce min touch target height and use folder icon
      assert.match(
        homeContent,
        /to="\/chantiers"[\s\S]*?min-h-\[52px\][\s\S]*?FolderKanban[\s\S]*?Gérer les chantiers/,
        'Shortcut must enforce min-h-[52px], render FolderKanban icon and "Gérer les chantiers" label'
      );
    });
  });
});
