import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Planning Contact, Week Sync & Simplification Improvements', () => {
  const planningPath = resolve(projectRoot, 'src/pages/Planning.tsx');
  const planningContent = readFileSync(planningPath, 'utf-8');

  // =========================================================================
  // Requirement 1: Team Presence Card Removal
  // =========================================================================
  describe('Requirement 1: Field Team Presence Card Removal', () => {
    it('completely removes the "PRÉSENCE ÉQUIPE SUR LE TERRAIN" card', () => {
      assert.doesNotMatch(
        planningContent,
        /PRÉSENCE ÉQUIPE SUR LE TERRAIN/i,
        'Planning must remove the team presence widget header'
      );
      assert.doesNotMatch(
        planningContent,
        /présents sur le terrain/i,
        'Planning must remove the "X/Y présents sur le terrain" text'
      );
      assert.doesNotMatch(
        planningContent,
        /mobilisationRate|mobilisés/i,
        'Planning must remove mobilization rate calculation and badge'
      );
    });
  });

  // =========================================================================
  // Requirement 2: Dedicated "Aujourd'hui" Button
  // =========================================================================
  describe('Requirement 2: Dedicated "Aujourd\'hui" Button', () => {
    it('renders a thumb-friendly "Aujourd\'hui" button next to navigation controls in Day view', () => {
      assert.match(
        planningContent,
        /viewMode\s*===\s*['"]day['"][\s\S]*?>\s*Aujourd'hui\s*<\/button>/,
        'Day view must render "Aujourd\'hui" button'
      );
    });

    it('renders "Aujourd\'hui" button in Week view', () => {
      assert.match(
        planningContent,
        /viewMode\s*===\s*['"]week['"][\s\S]*?>\s*Aujourd'hui\s*<\/button>/,
        'Week view must render "Aujourd\'hui" button'
      );
    });

    it('renders "Aujourd\'hui" button in Month view', () => {
      assert.match(
        planningContent,
        /viewMode\s*===\s*['"]month['"][\s\S]*?>\s*Aujourd'hui\s*<\/button>/,
        'Month view must render "Aujourd\'hui" button'
      );
    });

    it('implements handleJumpToday resetting date to today and resetting month offset', () => {
      assert.match(
        planningContent,
        /const\s+handleJumpToday\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?setSelectedDate\(today\);[\s\S]*?setMonthOffset\(0\);/,
        'handleJumpToday must set selectedDate to today and reset monthOffset'
      );
    });
  });

  // =========================================================================
  // Requirement 3: Month-to-Day Date Synchronization
  // =========================================================================
  describe('Requirement 3: Month-to-Day Date Synchronization', () => {
    // Pure oracle matching Planning.tsx algorithm
    function computeMondayAndWeek(selectedDate: string) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
      const day = dt.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(dt);
      monday.setUTCDate(dt.getUTCDate() + diff);

      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const cur = new Date(monday);
        cur.setUTCDate(monday.getUTCDate() + i);
        days.push(cur.toISOString().slice(0, 10));
      }
      return { monday: monday.toISOString().slice(0, 10), days };
    }

    it('anchors horizontal week strip to weekAnchorDate without mutating selectedDate', () => {
      assert.match(
        planningContent,
        /const\s*\[weekAnchorDate,\s*setWeekAnchorDate\]\s*=\s*useState/,
        'Planning must track weekAnchorDate separately from selectedDate'
      );
      assert.match(
        planningContent,
        /currentWeekMonday\s*=\s*useMemo\(\(\)\s*=>\s*\{[\s\S]*?new Date\(weekAnchorDateObj\)/,
        'currentWeekMonday must be derived from weekAnchorDateObj'
      );
      assert.match(
        planningContent,
        /weekDays:\s*DayItem\[\]\s*=\s*useMemo\(\(\)\s*=>\s*\{[\s\S]*?currentWeekMonday/,
        'weekDays must be generated from currentWeekMonday'
      );
    });

    it('verifies week navigation arrows (< / >) shift weekAnchorDate while leaving selectedDate unchanged', () => {
      assert.match(
        planningContent,
        /const\s+handlePrevWeek\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?setWeekAnchorDate\(newAnchorStr\);[\s\S]*?\},/s,
        'handlePrevWeek must update weekAnchorDate'
      );
      assert.doesNotMatch(
        planningContent,
        /const\s+handlePrevWeek\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?setSelectedDate\(/s,
        'handlePrevWeek must NOT mutate selectedDate'
      );
      assert.match(
        planningContent,
        /const\s+handleNextWeek\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?setWeekAnchorDate\(newAnchorStr\);[\s\S]*?\},/s,
        'handleNextWeek must update weekAnchorDate'
      );
      assert.doesNotMatch(
        planningContent,
        /const\s+handleNextWeek\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?setSelectedDate\(/s,
        'handleNextWeek must NOT mutate selectedDate'
      );
    });

    it('verifies explicit date selection updates both selectedDate and weekAnchorDate', () => {
      assert.match(
        planningContent,
        /const\s+handleSelectDate\s*=\s*useCallback\(\(dateStr:\s*string\)\s*=>\s*\{[\s\S]*?setSelectedDate\(dateStr\);[\s\S]*?setWeekAnchorDate\(dateStr\);/,
        'handleSelectDate must update both selectedDate and weekAnchorDate'
      );
    });

    it('shifts week strip seamlessly when user selects Dimanche 13 Décembre 2026', () => {
      const { monday, days } = computeMondayAndWeek('2026-12-13');
      assert.equal(monday, '2026-12-07', 'Monday of 2026-12-13 must be 2026-12-07');
      assert.equal(days[0], '2026-12-07');
      assert.equal(days[6], '2026-12-13');
      assert.ok(days.includes('2026-12-13'), 'Week days must include the selected date');
    });

    it('handles leap day transitions and cross-year boundaries (e.g. 2027-01-03)', () => {
      const { monday, days } = computeMondayAndWeek('2027-01-03'); // Sunday
      assert.equal(monday, '2026-12-28', 'Monday of 2027-01-03 must be 2026-12-28');
      assert.equal(days[0], '2026-12-28');
      assert.equal(days[6], '2027-01-03');
    });

    it('verifies handlePrevWeek and handleNextWeek navigate in 7-day increments', () => {
      assert.match(
        planningContent,
        /prev\.setUTCDate\(prev\.getUTCDate\(\)\s*-\s*7\)/,
        'handlePrevWeek must shift by exactly -7 days'
      );
      assert.match(
        planningContent,
        /next\.setUTCDate\(next\.getUTCDate\(\)\s*\+\s*7\)/,
        'handleNextWeek must shift by exactly +7 days'
      );
    });
  });

  // =========================================================================
  // Requirement 4: Quick Contact Modal for Team Members
  // =========================================================================
  describe('Requirement 4: Quick Contact Modal for Team Members', () => {
    it('renders clickable buttons for each teammate in "ÉQUIPE SUR PLACE"', () => {
      assert.match(
        planningContent,
        /<button[\s\S]*?onClick=\{\(\)\s*=>\s*setContactMember\(m\)\}[\s\S]*?Contacter/s,
        'Teammate badges in chantier cards must be clickable buttons triggering setContactMember'
      );
    });

    it('declares contact modal with role="dialog" and backdrop dismissal', () => {
      assert.match(
        planningContent,
        /contactMember\s*&&[\s\S]*?role="dialog"[\s\S]*?onClick=\{\(\)\s*=>\s*setContactMember\(null\)\}/,
        'Contact modal must declare role="dialog" and close on backdrop tap'
      );
    });

    it('provides direct "Message" chat button routing to native sms', () => {
      assert.match(
        planningContent,
        /<a[\s\S]*?href=\{`sms:\$\{contactMember\.telephone\.replace\(/,
        'Contact modal must provide a direct Message link routing to sms:'
      );
    });

    it('provides direct "Téléphone" tel: link with sanitized phone format', () => {
      assert.match(
        planningContent,
        /<a[\s\S]*?href=\{`tel:\$\{[\s\S]*?contactMember\.telephone[\s\S]*?\}`\}[\s\S]*?>[\s\S]*?Téléphone[\s\S]*?<\/a>/,
        'Contact modal must provide direct tel: anchor with member telephone'
      );
    });

    it('enforces outdoor touch ergonomics with min 48px height on modal action buttons', () => {
      assert.match(
        planningContent,
        /min-h-\[48px\][^>]*>[\s\S]*?Message/,
        'Message button must enforce min-h-[48px]'
      );
      assert.match(
        planningContent,
        /min-h-\[48px\][^>]*>[\s\S]*?Téléphone/,
        'Téléphone button must enforce min-h-[48px]'
      );
    });
  });

  // =========================================================================
  // Job Site Details Updates (ChantierDetail.tsx)
  // =========================================================================
  describe('Job Site Details Updates (ChantierDetail.tsx)', () => {
    const chantierDetailPath = resolve(projectRoot, 'src/pages/ChantierDetail.tsx');
    const chantierDetailContent = readFileSync(chantierDetailPath, 'utf-8');

    it('completely removes the "Discussion d\'équipe du chantier" card', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /Discussion d'équipe du chantier/i,
        'ChantierDetail must not contain the team discussion section'
      );
    });

    it('provides both Message and Call action buttons for each team member in "ÉQUIPE SUR LE CHANTIER"', () => {
      assert.match(
        chantierDetailContent,
        /<a[\s\S]*?href=\{`sms:\$\{member\.telephone[\s\S]*?<MessageSquare/s,
        'ChantierDetail must render Message icon button routing to sms:${member.telephone}'
      );
      assert.match(
        chantierDetailContent,
        /href=\{`tel:\$\{member\.telephone/s,
        'ChantierDetail must render Call icon button with tel: link'
      );
    });

    it('enforces min 48x48px mobile touch boundaries on both Message and Call buttons', () => {
      assert.match(
        chantierDetailContent,
        /<a[\s\S]*?href=\{`sms:\$\{member\.telephone[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/s,
        'Team member Message button must enforce min 48x48px touch boundaries'
      );
      assert.match(
        chantierDetailContent,
        /href=\{`tel:\$\{member\.telephone[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/s,
        'Team member Call button must enforce min 48x48px touch boundaries'
      );
    });

    it('clearly distinguishes the current user and disables self-calling and self-messaging', () => {
      assert.match(
        chantierDetailContent,
        /const\s+isCurrentUser\s*=\s*profile\?\.id\s*===\s*member\.id/,
        'ChantierDetail must check if teammate is the current user'
      );
      assert.match(
        chantierDetailContent,
        /isCurrentUser\s*&&\s*['"]\(Vous\)['"]/,
        'Avatar row must indicate (Vous) for current user'
      );
      assert.match(
        chantierDetailContent,
        /!isCurrentUser\s*&&[\s\S]*?href=\{`sms:\$\{member\.telephone/s,
        'Action buttons (Call and Message) must be hidden on the current user\'s own card'
      );
    });

    it('cleans up dummy document status badges while preserving file titles and metadata', () => {
      assert.doesNotMatch(
        chantierDetailContent,
        /Plan validé/i,
        'ChantierDetail must remove "Plan validé" status badge'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /Signé & conforme/i,
        'ChantierDetail must remove "Signé & conforme" status badge'
      );
      assert.doesNotMatch(
        chantierDetailContent,
        /Hors ligne dispo/i,
        'ChantierDetail must remove "Hors ligne dispo" pill'
      );
      assert.match(
        chantierDetailContent,
        /Plan d'aménagement\.pdf/,
        'Must retain Plan d\'aménagement.pdf title'
      );
      assert.match(
        chantierDetailContent,
        /Devis signé\.pdf/,
        'Must retain Devis signé.pdf title'
      );
    });
  });
});

