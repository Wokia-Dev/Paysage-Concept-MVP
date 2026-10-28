/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

/**
 * Pure oracle replica of the Planning.tsx month grid generator algorithm
 */
function generateMonthGridOracle(year: number, monthIndex: number, selectedDate: string, todayDateStr: string) {
  const currentMonthDate = new Date(year, monthIndex, 1);
  const curYear = currentMonthDate.getFullYear();
  const curMonth = currentMonthDate.getMonth();

  const firstDayOfMonth = new Date(curYear, curMonth, 1);
  const lastDayOfMonth = new Date(curYear, curMonth + 1, 0);

  // Jour de la semaine du 1er du mois (Lundi = 0, ..., Dimanche = 6)
  const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: {
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[] = [];

  // Jours du mois précédent pour combler la première semaine
  const prevMonthLastDay = new Date(curYear, curMonth, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(curYear, curMonth - 1, prevMonthLastDay - i);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    const d = String(prevDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    days.push({
      dateStr,
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayDateStr,
      isSelected: dateStr === selectedDate,
    });
  }

  // Jours du mois courant
  for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
    const dStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    days.push({
      dateStr: dStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dStr === todayDateStr,
      isSelected: dStr === selectedDate,
    });
  }

  // Jours du mois suivant pour compléter la grille jusqu'à un multiple de 7
  const remainder = days.length % 7;
  if (remainder > 0) {
    const fillCount = 7 - remainder;
    for (let i = 1; i <= fillCount; i++) {
      const nextDate = new Date(curYear, curMonth + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isSelected: dateStr === selectedDate,
      });
    }
  }

  return days;
}

/**
 * Pure oracle replica of week generator algorithm from Planning.tsx
 */
function generateWeekDaysOracle(baseDate: Date, weekOffset: number, todayDateStr: string) {
  const currentDayOfWeek = baseDate.getDay();
  const mondayDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayDiff + weekOffset * 7);

  const days: {
    dateStr: string;
    dayNumber: number;
    dayName: string;
    isToday: boolean;
    dateObj: Date;
  }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
      .format(d)
      .replace('.', '')
      .toUpperCase();

    days.push({
      dateStr,
      dayNumber: d.getDate(),
      dayName,
      isToday: dateStr === todayDateStr,
      dateObj: d,
    });
  }
  return days;
}

/**
 * Pure oracle of team presence math from Planning.tsx
 */
function computeTeamPresence(
  affectations: { profile_id: string; date_intervention: string }[],
  profiles: { id: string; prenom: string; nom: string }[],
  selectedDate: string
) {
  const dayAffs = affectations.filter((a) => a.date_intervention === selectedDate);
  const assignedIds = new Set(dayAffs.map((a) => a.profile_id));
  const assignedMembers = profiles.filter((p) => assignedIds.has(p.id));
  const presentCount = assignedIds.size;
  const totalCount = profiles.length;
  const mobilizationRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return {
    presentCount,
    totalCount,
    assignedMembers,
    mobilizationRate,
  };
}

describe('Milestone 3 Adversarial Stress Suite (Challenger 1)', () => {
  const planningPath = resolve(projectRoot, 'src/pages/Planning.tsx');
  const chantierDetailPath = resolve(projectRoot, 'src/pages/ChantierDetail.tsx');

  const planningContent = readFileSync(planningPath, 'utf-8');
  const chantierDetailContent = readFileSync(chantierDetailPath, 'utf-8');

  // =========================================================================
  // Dimension 1: Calendar Grid Math across 28, 29, 30, and 31-day Months & Leap Years
  // =========================================================================
  describe('Dimension 1: Calendar Grid Math across 28, 29, 30, 31-day Months & Leap Years', () => {
    it('verifies 28-day non-leap February (2021, 2022, 2023, 2025, 2026, 2027) calendar grids', () => {
      const nonLeapYears = [2021, 2022, 2023, 2025, 2026, 2027];
      for (const year of nonLeapYears) {
        const grid = generateMonthGridOracle(year, 1, `${year}-02-15`, '2026-10-28');

        // Length must be a multiple of 7
        assert.equal(grid.length % 7, 0, `Year ${year} Feb grid length (${grid.length}) must be multiple of 7`);
        assert.ok(grid.length === 28 || grid.length === 35, `Feb grid length must be 28 or 35 days, got ${grid.length}`);

        // Current month days count must be exactly 28
        const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
        assert.equal(currentMonthDays.length, 28, `Year ${year} Feb must have exactly 28 current month days`);

        // Check sequential continuity without gaps
        for (let i = 1; i < grid.length; i++) {
          const prev = new Date(grid[i - 1].dateStr);
          const curr = new Date(grid[i].dateStr);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          assert.equal(diffDays, 1, `Day ${grid[i].dateStr} must be exactly 1 day after ${grid[i - 1].dateStr}`);
        }
      }
    });

    it('verifies 29-day leap February (2020, 2024, 2028, 2032, 2000) calendar grids', () => {
      const leapYears = [2000, 2020, 2024, 2028, 2032];
      for (const year of leapYears) {
        const grid = generateMonthGridOracle(year, 1, `${year}-02-29`, '2026-10-28');

        assert.equal(grid.length % 7, 0, `Leap year ${year} Feb grid length must be multiple of 7`);
        const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
        assert.equal(currentMonthDays.length, 29, `Leap year ${year} Feb must have exactly 29 current month days`);

        // Verify Feb 29 exists and is current month
        const feb29 = grid.find((d) => d.dateStr === `${year}-02-29`);
        assert.ok(feb29, `Feb 29 must exist in leap year ${year}`);
        assert.equal(feb29.isCurrentMonth, true, `Feb 29 must be flagged as isCurrentMonth`);
        assert.equal(feb29.dayNumber, 29, `Feb 29 dayNumber must be 29`);
      }
    });

    it('verifies non-leap century boundary year 1900 and 2100 February (28 days)', () => {
      for (const centuryYear of [1900, 2100]) {
        const grid = generateMonthGridOracle(centuryYear, 1, `${centuryYear}-02-15`, '2026-10-28');
        const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
        assert.equal(currentMonthDays.length, 28, `Century year ${centuryYear} Feb must have exactly 28 days`);
        const feb29 = grid.find((d) => d.dateStr === `${centuryYear}-02-29`);
        assert.equal(feb29, undefined, `Feb 29 must NOT exist in non-leap century year ${centuryYear}`);
      }
    });

    it('verifies 30-day months (Avril, Juin, Septembre, Novembre) across diverse years', () => {
      const thirtyDayMonths = [3, 5, 8, 10]; // April, June, Sept, Nov (0-indexed)
      const testYears = [2024, 2025, 2026, 2027];

      for (const year of testYears) {
        for (const month of thirtyDayMonths) {
          const grid = generateMonthGridOracle(year, month, `${year}-01-01`, '2026-10-28');
          assert.equal(grid.length % 7, 0, `Year ${year} Month ${month + 1} length must be multiple of 7`);
          const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
          assert.equal(currentMonthDays.length, 30, `Month ${month + 1} must have exactly 30 days in year ${year}`);
          assert.equal(currentMonthDays[0].dayNumber, 1, 'First day must be 1');
          assert.equal(currentMonthDays[29].dayNumber, 30, 'Last day must be 30');
        }
      }
    });

    it('verifies 31-day months (Janvier, Mars, Mai, Juillet, Août, Octobre, Décembre)', () => {
      const thirtyOneDayMonths = [0, 2, 4, 6, 7, 9, 11];
      const testYears = [2024, 2025, 2026];

      for (const year of testYears) {
        for (const month of thirtyOneDayMonths) {
          const grid = generateMonthGridOracle(year, month, `${year}-01-01`, '2026-10-28');
          assert.equal(grid.length % 7, 0, `Year ${year} Month ${month + 1} length must be multiple of 7`);
          const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
          assert.equal(currentMonthDays.length, 31, `Month ${month + 1} must have exactly 31 days in year ${year}`);
          assert.equal(currentMonthDays[0].dayNumber, 1, 'First day must be 1');
          assert.equal(currentMonthDays[30].dayNumber, 31, 'Last day must be 31');
        }
      }
    });

    it('exhaustively stress-tests 1200 consecutive months (100 years: 2000-2099) for calendar invariants', () => {
      let monthsChecked = 0;
      for (let y = 2000; y <= 2099; y++) {
        for (let m = 0; m < 12; m++) {
          const grid = generateMonthGridOracle(y, m, `${y}-05-15`, '2026-10-28');

          // 1. Multiple of 7
          assert.equal(grid.length % 7, 0, `Grid length must be multiple of 7 for ${y}-${m + 1}`);
          assert.ok(grid.length >= 28 && grid.length <= 42, `Grid length must be 28, 35, or 42`);

          // 2. Starts on Monday (col 0 = Monday in JavaScript Date: getDay() === 1)
          const firstGridDate = new Date(grid[0].dateStr);
          assert.equal(firstGridDate.getDay(), 1, `First cell in grid must always be a Monday for ${y}-${m + 1}`);

          // 3. Ends on Sunday (col 6 = Sunday in JavaScript Date: getDay() === 0)
          const lastGridDate = new Date(grid[grid.length - 1].dateStr);
          assert.equal(lastGridDate.getDay(), 0, `Last cell in grid must always be a Sunday for ${y}-${m + 1}`);

          // 4. Exact match with standard JavaScript days in month
          const expectedDaysInMonth = new Date(y, m + 1, 0).getDate();
          const actualDaysInMonth = grid.filter((d) => d.isCurrentMonth).length;
          assert.equal(actualDaysInMonth, expectedDaysInMonth, `Mismatch in month day count for ${y}-${m + 1}`);

          // 5. Strict date continuity
          for (let i = 1; i < grid.length; i++) {
            const p = new Date(grid[i - 1].dateStr);
            const c = new Date(grid[i].dateStr);
            const diff = Math.round((c.getTime() - p.getTime()) / (1000 * 60 * 60 * 24));
            assert.equal(diff, 1, `Non-continuous date progression at index ${i} in ${y}-${m + 1}`);
          }

          monthsChecked++;
        }
      }
      assert.equal(monthsChecked, 1200, 'Exhaustively tested 1200 months across 100 years');
    });

    it('verifies year boundary transitions (Dec 31 -> Jan 1) and offset handling', () => {
      // Testing January 2026 grid: previous month must be December 2025
      const jan2026Grid = generateMonthGridOracle(2026, 0, '2026-01-01', '2026-10-28');
      const prevYearDays = jan2026Grid.filter((d) => !d.isCurrentMonth && d.dateStr.startsWith('2025-12'));
      assert.ok(prevYearDays.length > 0, 'Jan 2026 grid must contain trailing Dec 2025 days');
      assert.ok(
        prevYearDays.some((d) => d.dateStr === '2025-12-31'),
        'Dec 31, 2025 must be present in Jan 2026 grid leading days'
      );

      // Testing December 2026 grid: next month must be January 2027
      const dec2026Grid = generateMonthGridOracle(2026, 11, '2026-12-25', '2026-10-28');
      const nextYearDays = dec2026Grid.filter((d) => !d.isCurrentMonth && d.dateStr.startsWith('2027-01'));
      assert.ok(nextYearDays.length > 0, 'Dec 2026 grid must contain leading Jan 2027 days');
      assert.ok(
        nextYearDays.some((d) => d.dateStr === '2027-01-01'),
        'Jan 1, 2027 must be present in Dec 2026 grid trailing days'
      );
    });
  });

  // =========================================================================
  // Dimension 2: Week Horizon Calculation & Navigation Offset Stress-Testing
  // =========================================================================
  describe('Dimension 2: Week Horizon Calculation & Navigation Offset Stress-Testing', () => {
    it('verifies week generation starts strictly on Monday and ends on Sunday for any day of week', () => {
      // Test when today is Sunday, Monday, Wednesday, Saturday
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const testDate = new Date(2026, 9, 18 + dayOffset); // Oct 18 is Sunday, Oct 19 is Monday...
        const week = generateWeekDaysOracle(testDate, 0, '2026-10-28');

        assert.equal(week.length, 7, 'Week must always contain 7 days');
        assert.equal(week[0].dateObj.getDay(), 1, `Day 0 of week must be Monday for testDate ${testDate.toDateString()}`);
        assert.equal(week[6].dateObj.getDay(), 0, `Day 6 of week must be Sunday for testDate ${testDate.toDateString()}`);
        assert.equal(week[0].dayName, 'LUN', 'First day name must be LUN');
        assert.equal(week[6].dayName, 'DIM', 'Last day name must be DIM');
      }
    });

    it('verifies week offsets from -52 weeks to +52 weeks (full year range)', () => {
      const today = new Date(2026, 9, 28); // Wednesday Oct 28, 2026
      for (let offset = -52; offset <= 52; offset++) {
        const week = generateWeekDaysOracle(today, offset, '2026-10-28');
        assert.equal(week.length, 7, `Week at offset ${offset} must have 7 days`);
        assert.equal(week[0].dateObj.getDay(), 1, `Week at offset ${offset} must start on Monday`);

        // Check 7 consecutive days
        for (let i = 1; i < 7; i++) {
          const diff = Math.round((week[i].dateObj.getTime() - week[i - 1].dateObj.getTime()) / (1000 * 60 * 60 * 24));
          assert.equal(diff, 1, `Consecutive days broken at index ${i} offset ${offset}`);
        }
      }
    });
  });

  // =========================================================================
  // Dimension 3: Team Presence Card Combinatorial Stress-Testing
  // =========================================================================
  describe('Dimension 3: Team Presence Card Combinatorial Stress-Testing', () => {
    const mockProfiles = [
      { id: 'prof-1', prenom: 'Lucas', nom: 'Giraud' },
      { id: 'prof-2', prenom: 'Maxime', nom: 'Bernard' },
      { id: 'prof-3', prenom: 'Sophie', nom: 'Dubois' },
      { id: 'prof-4', prenom: 'Thomas', nom: 'Moreau' },
      { id: 'prof-5', prenom: 'Camille', nom: 'Lefebvre' },
    ];

    it('computes 0% mobilization when 0 workers are assigned', () => {
      const result = computeTeamPresence([], mockProfiles, '2026-10-28');
      assert.equal(result.presentCount, 0, 'presentCount must be 0');
      assert.equal(result.totalCount, 5, 'totalCount must match profiles length');
      assert.equal(result.mobilizationRate, 0, 'mobilizationRate must be 0%');
      assert.equal(result.assignedMembers.length, 0, 'assignedMembers must be empty');
    });

    it('computes 100% mobilization when all workers are assigned', () => {
      const affs = mockProfiles.map((p) => ({
        profile_id: p.id,
        date_intervention: '2026-10-28',
      }));
      const result = computeTeamPresence(affs, mockProfiles, '2026-10-28');
      assert.equal(result.presentCount, 5, 'presentCount must be 5');
      assert.equal(result.totalCount, 5, 'totalCount must be 5');
      assert.equal(result.mobilizationRate, 100, 'mobilizationRate must be 100%');
      assert.equal(result.assignedMembers.length, 5, 'assignedMembers must contain all 5');
    });

    it('computes exact fractional mobilization rates (e.g. 1/5 = 20%, 2/5 = 40%, 3/5 = 60%, 4/5 = 80%)', () => {
      const expectedRates = [
        { count: 1, rate: 20 },
        { count: 2, rate: 40 },
        { count: 3, rate: 60 },
        { count: 4, rate: 80 },
      ];

      for (const { count, rate } of expectedRates) {
        const affs = mockProfiles.slice(0, count).map((p) => ({
          profile_id: p.id,
          date_intervention: '2026-10-28',
        }));
        const result = computeTeamPresence(affs, mockProfiles, '2026-10-28');
        assert.equal(result.presentCount, count, `presentCount should be ${count}`);
        assert.equal(result.mobilizationRate, rate, `mobilizationRate should be ${rate}%`);
        assert.equal(result.assignedMembers.length, count, `assignedMembers should have ${count} members`);
      }
    });

    it('correctly de-duplicates workers assigned to multiple chantiers on the same date', () => {
      // prof-1 is assigned to 3 different chantiers on the same day
      const affs = [
        { profile_id: 'prof-1', date_intervention: '2026-10-28' },
        { profile_id: 'prof-1', date_intervention: '2026-10-28' },
        { profile_id: 'prof-1', date_intervention: '2026-10-28' },
        { profile_id: 'prof-2', date_intervention: '2026-10-28' },
      ];
      const result = computeTeamPresence(affs, mockProfiles, '2026-10-28');
      // Set deduplication must yield 2 distinct workers
      assert.equal(result.presentCount, 2, 'Multiple assignments for same worker must be de-duplicated');
      assert.equal(result.mobilizationRate, 40, '2 out of 5 is 40%');
      assert.equal(result.assignedMembers.length, 2, 'assignedMembers must have 2 profiles');
    });

    it('safely handles empty profiles list (0 total profiles) without division by zero or NaN', () => {
      const affs = [{ profile_id: 'prof-1', date_intervention: '2026-10-28' }];
      const result = computeTeamPresence(affs, [], '2026-10-28');
      assert.equal(result.totalCount, 0, 'totalCount must be 0');
      assert.equal(result.mobilizationRate, 0, 'mobilizationRate must be 0, not NaN or Infinity');
      assert.equal(Number.isNaN(result.mobilizationRate), false, 'mobilizationRate must not be NaN');
    });

    it('ignores assignments on different dates', () => {
      const affs = [
        { profile_id: 'prof-1', date_intervention: '2026-10-27' },
        { profile_id: 'prof-2', date_intervention: '2026-10-29' },
        { profile_id: 'prof-3', date_intervention: '2026-10-28' },
      ];
      const result = computeTeamPresence(affs, mockProfiles, '2026-10-28');
      assert.equal(result.presentCount, 1, 'Only assignments on selectedDate must be counted');
      assert.equal(result.assignedMembers[0].id, 'prof-3', 'Only prof-3 should be assigned for 2026-10-28');
    });
  });

  // =========================================================================
  // Dimension 4: GPS Link URL Encoding & Robustness with French Accents & Symbols
  // =========================================================================
  describe('Dimension 4: GPS Link URL Encoding & Robustness with French Accents & Symbols', () => {
    const testAddresses = [
      '12 Rue de l\'Étang, 75001 Paris',
      '14, Chemin des Prés & Jardins, 69000 Lyon',
      'Allée des Chênes, Forêt d\'Othe, 10160 Aix-Villemaur-Pâlis',
      'Côte Saint-André, 38260 La Côte-Saint-André',
      'Île-de-France, Bâtiment B / Étage 1, N° 45, 92000 Nanterre',
      'Avenue Général de Gaulle #4, Résidence "L\'Orangerie"',
      'Place de l\'Hôtel de Ville & Rue Saint-Honoré, 75001 Paris',
    ];

    it('verifies ChantierDetail and Planning strictly use encodeURIComponent for GPS links', () => {
      assert.match(
        chantierDetailContent,
        /https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}/,
        'ChantierDetail must wrap chantier.adresse in encodeURIComponent'
      );
      assert.match(
        planningContent,
        /https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}/,
        'Planning must wrap chantier.adresse in encodeURIComponent'
      );
    });

    it('guarantees round-trip encoding and URI safety for all French addresses with accents and symbols', () => {
      for (const addr of testAddresses) {
        const encoded = encodeURIComponent(addr);
        const fullUrl = `https://maps.google.com/?q=${encoded}`;

        // 1. Must parse as a valid URL without throwing
        const urlObj = new URL(fullUrl);
        assert.equal(urlObj.origin, 'https://maps.google.com', 'Origin must be maps.google.com');
        assert.equal(urlObj.pathname, '/', 'Pathname must be /');

        // 2. Query parameter 'q' must decode back exactly to original address
        const retrievedQ = urlObj.searchParams.get('q');
        assert.equal(retrievedQ, addr, `Decoded searchParam must match original for "${addr}"`);

        // 3. Must not leave unsafe raw delimiters in encoded portion
        assert.doesNotMatch(encoded, /\s/, 'Encoded query string must not contain raw whitespace');
        assert.doesNotMatch(encoded, /&/, 'Encoded query string must not contain raw ampersands');
        assert.doesNotMatch(encoded, /#/, 'Encoded query string must not contain raw hash fragment delimiters');
      }
    });

    it('handles edge case of empty or special punctuation addresses', () => {
      const edgeAddresses = ['', '   ', '???', '---', '100%'];
      for (const edge of edgeAddresses) {
        const encoded = encodeURIComponent(edge);
        const fullUrl = `https://maps.google.com/?q=${encoded}`;
        const urlObj = new URL(fullUrl);
        assert.equal(urlObj.searchParams.get('q'), edge, `Edge address "${edge}" must round-trip cleanly`);
      }
    });
  });

  // =========================================================================
  // Dimension 5: Strict Media & Photo Upload Absence Invariants
  // =========================================================================
  describe('Dimension 5: Strict Media & Photo Upload Absence Invariants', () => {
    it('verifies ChantierDetail has zero <img> or <picture> elements', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<img\s+[^>]*>/i,
        'ChantierDetail must not contain any <img> tags'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /<picture\s*>/i,
        'ChantierDetail must not contain any <picture> tags'
      );
    });

    it('verifies ChantierDetail has zero file upload inputs or camera hooks', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /<input[^>]+type=["']file["']/i,
        'ChantierDetail must not render file inputs'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /useCamera|capturePhoto|getUserMedia/i,
        'ChantierDetail must not invoke camera capture logic'
      );
    });

    it('verifies Planning has zero <img> or <picture> tags', () => {
      assert.doesNotMatch(
        planningContent,
        /<img\s+[^>]*>/i,
        'Planning must not contain any <img> tags'
      );
      assert.doesNotMatch(
        planningContent,
        /<picture\s*>/i,
        'Planning must not contain any <picture> tags'
      );
    });

    it('confirms typographic document placeholders with Terracotta badges are present', () => {
      assert.match(
        chantierDetailContent,
        /Plan d'aménagement\.pdf/,
        'Must render Plan d\'aménagement.pdf card'
      );
      assert.match(
        chantierDetailContent,
        /Devis signé\.pdf/,
        'Must render Devis signé.pdf card'
      );
      assert.match(
        chantierDetailContent,
        /bg-terracotta.*?text-white/,
        'Must style document badge with Terracotta color'
      );
      assert.match(
        chantierDetailContent,
        /Phase 2/,
        'Must render Phase 2 photo placeholder card'
      );
    });

    it('confirms site chat shortcut routes to native sms scheme without live Realtime', () => {
      assert.match(
        chantierDetailContent,
        /<a\s+[^>]*href=\{`sms:\$\{member\.telephone/,
        'ChantierDetail must provide anchor with sms:${member.telephone}'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /supabase\.channel/i,
        'ChantierDetail must not open live Supabase Realtime channels'
      );
    });
  });

  // =========================================================================
  // Dimension 6: Outdoor Touch Target Ergonomics & Button Accessibility
  // =========================================================================
  describe('Dimension 6: Outdoor Touch Target Ergonomics & Button Accessibility', () => {
    it('verifies period toggle pills (Jour, Semaine, Mois) satisfy min 48x48px boundaries', () => {
      // Check Jour button
      assert.match(
        planningContent,
        /min-h-\[48px\]\s+min-w-\[64px\][^>]*>\s*Jour/s,
        'Jour pill must have min-h-[48px] and min-w-[64px]'
      );
      // Check Semaine button
      assert.match(
        planningContent,
        /min-h-\[48px\]\s+min-w-\[72px\][^>]*>\s*Semaine/s,
        'Semaine pill must have min-h-[48px] and min-w-[72px]'
      );
      // Check Mois button
      assert.match(
        planningContent,
        /min-h-\[48px\]\s+min-w-\[64px\][^>]*>\s*Mois/s,
        'Mois pill must have min-h-[48px] and min-w-[64px]'
      );
    });

    it('verifies month grid day buttons enforce min 48px height', () => {
      assert.match(
        planningContent,
        /monthGridDays\.map[\s\S]*?min-h-\[48px\]/,
        'Month grid day buttons must enforce min-h-[48px]'
      );
    });

    it('verifies floating circular action buttons in ChantierDetail meet 48x48px hit areas', () => {
      assert.match(
        chantierDetailContent,
        /w-12\s+h-12\s+min-w-\[48px\]\s+min-h-\[48px\]\s+rounded-full/,
        'Back arrow and GPS launcher in ChantierDetail must be 48x48px circular buttons'
      );
    });

    it('verifies full-width hero GPS navigation button in ChantierDetail meets min 48px height', () => {
      assert.match(
        chantierDetailContent,
        /w-full\s+min-h-\[48px\][\s\S]*?Lancer la navigation GPS/,
        'Hero GPS button must enforce min-h-[48px]'
      );
    });

    it('verifies week and month navigation chevrons enforce min 48x48px hit areas', () => {
      const matches = planningContent.match(/min-w-\[48px\]\s+min-h-\[48px\]/g);
      assert.ok(matches && matches.length >= 4, `Must have at least 4 chevron buttons with min 48x48px, found ${matches?.length}`);
    });

    it('verifies supervisor status update buttons and worker toggles satisfy 48px touch boundary', () => {
      assert.match(
        chantierDetailContent,
        /min-h-\[48px\][\s\S]*?Statut du chantier/,
        'Status updater buttons must enforce min-h-[48px]'
      );
      assert.match(
        chantierDetailContent,
        /min-h-\[48px\][\s\S]*?handleToggleWorker/,
        'Worker assignment items must enforce min-h-[48px]'
      );
    });
  });
});
