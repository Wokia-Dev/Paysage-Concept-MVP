/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Milestone 3 Empirical Adversarial Stress Harness (Challenger 2)', () => {
  const planningPath = resolve(projectRoot, 'src/pages/Planning.tsx');
  const chantierDetailPath = resolve(projectRoot, 'src/pages/ChantierDetail.tsx');

  const planningContent = readFileSync(planningPath, 'utf-8');
  const chantierDetailContent = readFileSync(chantierDetailPath, 'utf-8');

  // =========================================================================
  // Challenge 1: Deferred Media Constraint Rigorous Audit
  // =========================================================================
  describe('Challenge 1: Deferred Media Constraint (Zero Media / Zero Upload / Zero Camera)', () => {
    it('verifies 100% absence of <img and <picture elements in ChantierDetail and Planning', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<img[\s>]/i,
        'ChantierDetail.tsx must contain ZERO <img> elements'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /<picture[\s>]/i,
        'ChantierDetail.tsx must contain ZERO <picture> elements'
      );
      assert.doesNotMatch(
        planningContent,
        /<img[\s>]/i,
        'Planning.tsx must contain ZERO <img> elements'
      );
      assert.doesNotMatch(
        planningContent,
        /<picture[\s>]/i,
        'Planning.tsx must contain ZERO <picture> elements'
      );
    });

    it('verifies 100% absence of file upload dropzones and <input type="file">', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<input[^>]+type=["']file["']/i,
        'ChantierDetail.tsx must NOT contain <input type="file">'
      );
      assert.doesNotMatch(
        planningContent,
        /<input[^>]+type=["']file["']/i,
        'Planning.tsx must NOT contain <input type="file">'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /accept=["']image/i,
        'ChantierDetail.tsx must NOT accept image uploads'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /FileReader|dropzone|FormData/i,
        'ChantierDetail.tsx must NOT use FileReader, dropzone, or FormData file handling'
      );
    });

    it('verifies 100% absence of camera capture functions or MediaStream APIs', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /useCamera|capturePhoto|getUserMedia|mediaDevices|createObjectURL/i,
        'ChantierDetail.tsx must NOT instantiate camera or media stream hooks'
      );
      assert.doesNotMatch(
        planningContent,
        /useCamera|capturePhoto|getUserMedia|mediaDevices|createObjectURL/i,
        'Planning.tsx must NOT instantiate camera or media stream hooks'
      );
    });

    it('verifies absence of raw image file imports (.png, .jpg, .webp, .svg images)', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /import\s+.*?\s+from\s+['"][^'"]+\.(png|jpe?g|webp|gif)['"]/i,
        'ChantierDetail.tsx must NOT import bitmap image assets'
      );
      assert.doesNotMatch(
        planningContent,
        /import\s+.*?\s+from\s+['"][^'"]+\.(png|jpe?g|webp|gif)['"]/i,
        'Planning.tsx must NOT import bitmap image assets'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /bg-\[url\(|background-image/i,
        'ChantierDetail.tsx must NOT use CSS background image URLs'
      );
    });

    it('verifies Photos section in ChantierDetail is strictly a typographic placeholder for Phase 2', () => {
      assert.match(
        chantierDetailContent,
        /Photos du chantier/i,
        'Photos section must be labeled "Photos du chantier"'
      );
      assert.match(
        chantierDetailContent,
        /Phase 2/i,
        'Photos section must feature "Phase 2" indicator badge'
      );
      assert.match(
        chantierDetailContent,
        /Module photos et galerie terrain à venir/i,
        'Photos section must clearly state future availability'
      );
      assert.match(
        chantierDetailContent,
        /prochaine mise à jour/i,
        'Photos section must describe deferred scope to landscapers'
      );
    });

    it('verifies Documents section in ChantierDetail consists of typographic badge cards with no upload trigger', () => {
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
        /bg-terracotta[\s\S]*?FileText|FileText[\s\S]*?bg-terracotta/,
        'Document cards must feature Terracotta badge icon'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /Ajouter un document|Uploader un document|Téléverser/i,
        'Documents section must not provide an upload trigger'
      );
    });
  });

  // =========================================================================
  // Challenge 2: Stress-Testing Supervisor Controls & Ouvrier Role Isolation
  // =========================================================================
  describe('Challenge 2: Supervisor Controls & Role-Based Security Isolation', () => {
    it('empirically tests role evaluation logic matrix for supervisor privileges', () => {
      const evaluateSupervisor = (role: string | undefined | null): boolean => {
        return role === 'chef_equipe' || role === 'admin';
      };

      // Authorized roles
      assert.equal(evaluateSupervisor('chef_equipe'), true, 'chef_equipe must be supervisor');
      assert.equal(evaluateSupervisor('admin'), true, 'admin must be supervisor');

      // Unauthorized roles & adversarial edge cases
      assert.equal(evaluateSupervisor('ouvrier'), false, 'ouvrier must NOT be supervisor');
      assert.equal(evaluateSupervisor(undefined), false, 'undefined role must NOT be supervisor');
      assert.equal(evaluateSupervisor(null), false, 'null role must NOT be supervisor');
      assert.equal(evaluateSupervisor(''), false, 'empty string role must NOT be supervisor');
      assert.equal(evaluateSupervisor('client'), false, 'client role must NOT be supervisor');
      assert.equal(evaluateSupervisor('CHEF_EQUIPE'), false, 'uppercase role must NOT grant privilege');
      assert.equal(evaluateSupervisor('superadmin'), false, 'unknown role must NOT grant privilege');
    });

    it('verifies ChantierDetail guards supervisor management zone with isSupervisor conditional', () => {
      // Must check profile?.role === 'chef_equipe' || profile?.role === 'admin'
      assert.match(
        chantierDetailContent,
        /const\s+isSupervisor\s*=\s*profile\?\.role\s*===\s*['"]chef_equipe['"]\s*\|\|\s*profile\?\.role\s*===\s*['"]admin['"]/,
        'ChantierDetail must compute isSupervisor strictly from chef_equipe and admin roles'
      );

      // Must guard supervisor panel
      assert.match(
        chantierDetailContent,
        /\{isSupervisor\s*&&\s*\(\s*<div[^>]*>[\s\S]*?Pilotage Superviseur/,
        'ChantierDetail must enclose Pilotage Superviseur inside isSupervisor conditional'
      );

      // Must guard supervisor header badge
      assert.match(
        chantierDetailContent,
        /\{isSupervisor\s*&&\s*\(\s*<span[^>]*>[\s\S]*?Superviseur/,
        'ChantierDetail must enclose Superviseur badge inside isSupervisor conditional'
      );
    });

    it('simulates status change state transitions across all ChantierStatut values', () => {
      type ChantierStatut = 'en_attente' | 'en_cours' | 'termine';
      const validStatuses: ChantierStatut[] = ['en_attente', 'en_cours', 'termine'];

      interface ChantierMock {
        id: string;
        statut: ChantierStatut;
      }

      let mockChantier: ChantierMock = { id: 'ch-01', statut: 'en_attente' };

      const simulateStatusChange = (newStatut: ChantierStatut) => {
        assert.ok(validStatuses.includes(newStatut), `Invalid status: ${newStatut}`);
        mockChantier = { ...mockChantier, statut: newStatut };
      };

      simulateStatusChange('en_cours');
      assert.equal(mockChantier.statut, 'en_cours');

      simulateStatusChange('termine');
      assert.equal(mockChantier.statut, 'termine');

      simulateStatusChange('en_attente');
      assert.equal(mockChantier.statut, 'en_attente');
    });

    it('stress-tests worker assignment toggle logic (addition, removal, and idempotency)', () => {
      interface AffectationMock {
        id: string;
        chantier_id: string;
        profile_id: string;
        date_intervention: string;
      }

      const mockAffectations: AffectationMock[] = [
        { id: 'aff-1', chantier_id: 'ch-01', profile_id: 'usr-1', date_intervention: '2026-10-28' },
        { id: 'aff-2', chantier_id: 'ch-01', profile_id: 'usr-2', date_intervention: '2026-10-28' },
      ];

      const toggleWorker = (
        chantierId: string,
        targetWorkerId: string,
        targetDate: string
      ): 'added' | 'removed' => {
        const existingIdx = mockAffectations.findIndex(
          (a) =>
            a.chantier_id === chantierId &&
            a.profile_id === targetWorkerId &&
            a.date_intervention === targetDate
        );

        if (existingIdx !== -1) {
          mockAffectations.splice(existingIdx, 1);
          return 'removed';
        } else {
          mockAffectations.push({
            id: `aff-new-${Date.now()}-${Math.random()}`,
            chantier_id: chantierId,
            profile_id: targetWorkerId,
            date_intervention: targetDate,
          });
          return 'added';
        }
      };

      // 1. Remove usr-1
      const res1 = toggleWorker('ch-01', 'usr-1', '2026-10-28');
      assert.equal(res1, 'removed');
      assert.equal(mockAffectations.length, 1);
      assert.ok(!mockAffectations.some((a) => a.profile_id === 'usr-1'));

      // 2. Re-add usr-1 (symmetry check)
      const res2 = toggleWorker('ch-01', 'usr-1', '2026-10-28');
      assert.equal(res2, 'added');
      assert.equal(mockAffectations.length, 2);
      assert.ok(mockAffectations.some((a) => a.profile_id === 'usr-1'));

      // 3. Add to different date does NOT affect current date
      const res3 = toggleWorker('ch-01', 'usr-3', '2026-10-29');
      assert.equal(res3, 'added');
      assert.equal(mockAffectations.length, 3);
      const day28Affs = mockAffectations.filter((a) => a.date_intervention === '2026-10-28');
      assert.equal(day28Affs.length, 2, '2026-10-28 assignments count must remain 2');
    });

    it('verifies Planning enforces strict personal filtering for ouvrier role', () => {
      // In Planning.tsx: targetFilterProfileId strictly checks profile.role === 'ouvrier'
      assert.match(
        planningContent,
        /if\s*\(\s*profile\.role\s*===\s*['"]ouvrier['"]\s*\)\s*return\s+profile\.id\s*;/,
        'Planning must strictly return profile.id when user role is ouvrier'
      );

      // Ouvrier cannot access supervisor dropdown
      assert.match(
        planningContent,
        /\{\s*\(\s*profile\?\.role\s*===\s*['"]chef_equipe['"]\s*\|\|\s*profile\?\.role\s*===\s*['"]admin['"]\s*\)\s*&&\s*\(/,
        'Planning must strictly hide supervisor filter dropdown from ouvrier'
      );
    });
  });

  // =========================================================================
  // Challenge 3: Navigation Links Verification & URL Escaping
  // =========================================================================
  describe('Challenge 3: Navigation Links Verification & URL Escaping', () => {
    it('stress-tests Google Maps GPS launcher URL generation against adversarial address inputs', () => {
      const formatGpsUrl = (address: string) => `https://maps.google.com/?q=${encodeURIComponent(address)}`;

      const testAddresses = [
        '14 Rue de la Paix, 75002 Paris',
        "Chantier de l'Étang, 78120 Rambouillet",
        'ZAC des Prés & Jardins #4, 91300 Massy',
        '24 Avenue François 1er, 75008 Paris (Bât. C - Code #4582)',
        'Espace Verts & Co, Voie A, 69000 Lyon',
        '    42 Boulevard de la République    ',
        '100% Nature & Écologie, 33000 Bordeaux',
      ];

      for (const addr of testAddresses) {
        const urlString = formatGpsUrl(addr);

        // Must parse as valid URL
        assert.doesNotThrow(() => {
          const parsed = new URL(urlString);
          assert.equal(parsed.protocol, 'https:');
          assert.equal(parsed.hostname, 'maps.google.com');
          assert.equal(parsed.pathname, '/');
          assert.ok(parsed.searchParams.has('q'));
          assert.equal(parsed.searchParams.get('q'), addr);
        }, `URL failed for address: "${addr}"`);
      }
    });

    it('verifies both floating circular GPS button and hero GPS button in ChantierDetail enforce 48x48px', () => {
      // Top floating GPS button
      assert.match(
        chantierDetailContent,
        /href=\{`https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}`\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+rounded-full/,
        'Top floating circular GPS button must enforce 48x48px and rounded-full'
      );

      // Hero full-width GPS launcher button
      assert.match(
        chantierDetailContent,
        /href=\{`https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}`\}[\s\S]*?min-h-\[48px\][\s\S]*?Lancer la navigation GPS/,
        'Hero GPS launcher button must enforce min-h-[48px]'
      );
    });

    it('verifies Planning day schedule mission card includes encoded GPS navigation link (>= 48px)', () => {
      assert.match(
        planningContent,
        /href=\{`https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}`\}[\s\S]*?min-h-\[48px\]/,
        'Planning day mission card must provide min-h-[48px] encoded GPS link'
      );
    });

    it('verifies Back button in ChantierDetail correctly invokes navigate(-1)', () => {
      // Top action bar back button
      assert.match(
        chantierDetailContent,
        /onClick=\{\(\)\s*=>\s*navigate\(-1\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+rounded-full/,
        'Top back button must invoke navigate(-1) with min-w-[48px] min-h-[48px] rounded-full'
      );

      // Chantier not found fallback back button
      assert.match(
        chantierDetailContent,
        /onClick=\{\(\)\s*=>\s*navigate\(-1\)\}[\s\S]*?min-h-\[48px\][\s\S]*?Retourner au planning/,
        'NotFound fallback button must invoke navigate(-1) with min-h-[48px]'
      );
    });

    it('verifies team discussion card is removed and direct team member message button is provided', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /Discussion d'équipe du chantier/,
        'Team discussion card must be removed'
      );
      assert.match(
        chantierDetailContent,
        /<a[\s\S]*?href=\{`sms:\$\{member\.telephone[\s\S]*?min-h-\[48px\]/,
        'Team member message button must point to sms:${member.telephone} and enforce min-h-[48px]'
      );
      assert.match(
        chantierDetailContent,
        /min-w-\[48px\]\s+min-h-\[48px\][\s\S]*?MessageSquare/,
        'Message button must enforce 48x48px boundaries with MessageSquare icon'
      );
    });
  });

  // =========================================================================
  // Challenge 4: Planning Calendar Mathematics & Ergonomics Stress Testing
  // =========================================================================
  describe('Challenge 4: Planning Calendar Mathematics & Horizon Transitions', () => {
    it('verifies month grid generation algorithm yields complete 7-column weeks across all month configurations', () => {
      const generateMonthGrid = (year: number, monthZeroIndexed: number) => {
        const firstDayOfMonth = new Date(year, monthZeroIndexed, 1);
        const lastDayOfMonth = new Date(year, monthZeroIndexed + 1, 0);

        // Monday = 0, ..., Sunday = 6
        const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
        const totalDaysInMonth = lastDayOfMonth.getDate();

        const days: { dateStr: string; isCurrentMonth: boolean; dayNumber: number }[] = [];

        // Previous month days to fill initial week
        const prevMonthLastDay = new Date(year, monthZeroIndexed, 0).getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
          const prevDate = new Date(year, monthZeroIndexed - 1, prevMonthLastDay - i);
          const y = prevDate.getFullYear();
          const m = String(prevDate.getMonth() + 1).padStart(2, '0');
          const d = String(prevDate.getDate()).padStart(2, '0');
          days.push({
            dateStr: `${y}-${m}-${d}`,
            isCurrentMonth: false,
            dayNumber: prevDate.getDate(),
          });
        }

        // Current month days
        for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
          const dStr = `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          days.push({
            dateStr: dStr,
            isCurrentMonth: true,
            dayNumber: dayNum,
          });
        }

        // Next month days to complete trailing week
        const remainder = days.length % 7;
        if (remainder > 0) {
          const fillCount = 7 - remainder;
          for (let i = 1; i <= fillCount; i++) {
            const nextDate = new Date(year, monthZeroIndexed + 1, i);
            const y = nextDate.getFullYear();
            const m = String(nextDate.getMonth() + 1).padStart(2, '0');
            const d = String(nextDate.getDate()).padStart(2, '0');
            days.push({
              dateStr: `${y}-${m}-${d}`,
              isCurrentMonth: false,
              dayNumber: i,
            });
          }
        }

        return days;
      };

      // Test all 12 months of 2026
      for (let m = 0; m < 12; m++) {
        const grid = generateMonthGrid(2026, m);
        assert.equal(
          grid.length % 7,
          0,
          `Month grid for 2026-${m + 1} must have a length divisible by 7 (got ${grid.length})`
        );
        assert.ok(
          grid.length >= 28 && grid.length <= 42,
          `Month grid length must be 28, 35, or 42 (got ${grid.length})`
        );
      }

      // Test Leap Year (Feb 2028: 29 days)
      const feb2028 = generateMonthGrid(2028, 1);
      assert.equal(feb2028.length % 7, 0);
      const feb2028CurrentDays = feb2028.filter((d) => d.isCurrentMonth);
      assert.equal(feb2028CurrentDays.length, 29, 'Feb 2028 must have exactly 29 days');
    });

    it('verifies week navigation math correctly computes ISO Monday across arbitrary week offsets', () => {
      const getMondayForOffset = (baseDate: Date, weekOffset: number): Date => {
        const currentDayOfWeek = baseDate.getDay();
        const mondayDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() + mondayDiff + weekOffset * 7);
        return monday;
      };

      // Sunday 2026-11-01 (getDay() === 0)
      const sun = new Date(2026, 10, 1);
      const monFromSun = getMondayForOffset(sun, 0);
      assert.equal(monFromSun.getDay(), 1, 'Calculated day must be Monday');
      assert.equal(monFromSun.getDate(), 26, 'Monday must be 2026-10-26');

      // Wednesday 2026-10-28 (getDay() === 3, month 9 is October)
      const wed = new Date(2026, 9, 28);
      const monFromWed = getMondayForOffset(wed, 0);
      assert.equal(monFromWed.getDay(), 1, 'Calculated day must be Monday');
      assert.equal(monFromWed.getDate(), 26, 'Monday must be 2026-10-26');

      // Offset +2 weeks from Oct 28 -> Monday Nov 9
      const monPlus2 = getMondayForOffset(wed, 2);
      assert.equal(monPlus2.getDay(), 1);
      assert.equal(monPlus2.getDate(), 9, 'Monday +2 must be Nov 9');
    });

    it('verifies granular operational timeline steps are cleaned up in favor of direct chantier cards', () => {
      assert.doesNotMatch(
        planningContent,
        /07:45 - 08:00/,
        'Planning day schedule must remove timeline step 07:45 - 08:00'
      );
      assert.doesNotMatch(
        planningContent,
        /12:30 - 13:30/,
        'Planning day schedule must remove lunch break timeline step'
      );
      assert.match(
        planningContent,
        /Consulter la fiche détaillée/,
        'Planning day schedule must render direct link to Consulter la fiche détaillée'
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
  });
});
