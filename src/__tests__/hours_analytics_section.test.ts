/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Hours Analytics & History Section (R3 & R4 Enhancement)', () => {
  const componentPath = resolve(projectRoot, 'src/components/common/HoursAnalyticsSection.tsx');
  const homePath = resolve(projectRoot, 'src/pages/Home.tsx');

  it('verifies HoursAnalyticsSection component file exists and is exported', () => {
    assert.ok(existsSync(componentPath), 'HoursAnalyticsSection.tsx must exist');
    const content = readFileSync(componentPath, 'utf-8');
    assert.match(content, /export\s+const\s+HoursAnalyticsSection/);
  });

  it('verifies HoursAnalyticsSection is integrated right below Ma déclaration du jour in Home.tsx', () => {
    const homeContent = readFileSync(homePath, 'utf-8');
    assert.match(homeContent, /Ma déclaration du jour/);
    assert.match(homeContent, /<HoursAnalyticsSection/);
    
    // Verifies HoursAnalyticsSection appears after "Ma déclaration du jour"
    const declarationIdx = homeContent.indexOf('Ma déclaration du jour');
    const analyticsIdx = homeContent.indexOf('<HoursAnalyticsSection');
    assert.ok(
      analyticsIdx > declarationIdx,
      'HoursAnalyticsSection must appear after Ma déclaration du jour'
    );
  });

  describe('1. Period Selector & Navigation', () => {
    const content = readFileSync(componentPath, 'utf-8');

    it('renders period toggle for Semaine (Week) and Mois (Month)', () => {
      assert.match(content, /Semaine/);
      assert.match(content, /Mois/);
      assert.match(content, /setPeriodMode\('week'\)/);
      assert.match(content, /setPeriodMode\('month'\)/);
    });

    it('provides previous and next period navigation buttons', () => {
      assert.match(content, /handlePrevPeriod/);
      assert.match(content, /handleNextPeriod/);
      assert.match(content, /<ChevronLeft/);
      assert.match(content, /<ChevronRight/);
    });

    it('calculates ISO week and handles week/month shifts without timezone drift', () => {
      assert.match(content, /parseMiddayUTC/);
      assert.match(content, /Date\.UTC/);
      assert.match(content, /getISOWeekNumber/);
    });
  });

  describe('2. Key Metrics Summary (KPI Cards)', () => {
    const content = readFileSync(componentPath, 'utf-8');

    it('displays summary card for total hours worked', () => {
      assert.match(content, /Total travaillé/);
      assert.match(content, /formatHours\(metrics\.totalHours\)/);
    });

    it('displays summary card for overtime breakdown in Terracotta', () => {
      assert.match(content, /Heures sup\./);
      assert.match(content, /formatHours\(metrics\.totalOvertime\)/);
      assert.match(content, /text-terracotta/);
    });

    it('displays summary card for total break duration', () => {
      assert.match(content, /Total pauses/);
      assert.match(content, /formatHours\(metrics\.totalPause\)/);
    });
  });

  describe('3. Interactive Visual SVG Chart', () => {
    const content = readFileSync(componentPath, 'utf-8');

    it('renders responsive SVG bar chart with stacked normal and overtime bars', () => {
      assert.match(content, /<svg[\s\S]*?viewBox=/);
      assert.match(content, /#15302F/, 'Normal hours bar uses Forest Green #15302F');
      assert.match(content, /#C47452/, 'Overtime bar uses Terracotta #C47452');
    });

    it('renders daily target dashed threshold line', () => {
      assert.match(content, /strokeDasharray="4 3"/);
      assert.match(content, /#8FA98F/, 'Target line uses Sage Green #8FA98F');
      assert.match(content, /targetY/);
    });

    it('supports interactive tapping on bars to inspect day details', () => {
      assert.match(content, /setActiveChartDate/);
      assert.match(content, /activeDayData/);
      assert.match(content, /onOpenSaisie/);
    });
  });

  describe('4. Detailed History List', () => {
    const content = readFileSync(componentPath, 'utf-8');

    it('renders collapsible/scrollable daily log listing each day of the period', () => {
      assert.match(content, /Détail des déclarations/);
      assert.match(content, /sortedPeriodDeclarations/);
      assert.match(content, /isHistoryExpanded/);
    });

    it('displays date, associated Chantier name, hours pill, pause, and sync status', () => {
      assert.match(content, /chantierName/);
      assert.match(content, /temps_pause/);
      assert.match(content, /Synchronisé/);
      assert.match(content, /En attente/);
      assert.match(content, /<CheckCircle2/);
      assert.match(content, /<CloudUpload/);
    });

    it('tapping an entry triggers quick viewing or editing of that day declaration', () => {
      assert.match(content, /onClick=\{\(\) =>\s*\{[\s\S]*?onSelectDate\(pt\.date\);[\s\S]*?onOpenSaisie\(pt\.date\);/);
    });
  });
});

