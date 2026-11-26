import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const projectRoot = resolve(__dirname, '../../..');

export function readFilesConcat(relativePaths: string[]): string {
  return relativePaths
    .map((p) => readFileSync(resolve(projectRoot, p), 'utf-8'))
    .join('\n');
}

export function readHomeBundle(): string {
  return readFilesConcat([
    'src/pages/Home.tsx',
    'src/hooks/useHomeDashboard.ts',
    'src/components/home/HomeHeader.tsx',
    'src/components/home/HeroChantierCard.tsx',
    'src/components/home/DailyTargetEditor.tsx',
    'src/components/home/TimeRangeField.tsx',
    'src/components/home/TimeOvertimeAccordion.tsx',
    'src/components/home/TimeDeclarationModal.tsx',
    'src/components/home/TeamDailySummaryCard.tsx',
    'src/components/home/DailyDeclarationSummary.tsx',
    'src/lib/dates.ts',
    'src/lib/formatters.ts',
  ]);
}

export function readPlanningBundle(): string {
  return readFilesConcat([
    'src/pages/Planning.tsx',
    'src/hooks/usePlanningData.ts',
    'src/lib/planningUtils.ts',
    'src/lib/dates.ts',
    'src/lib/formatters.ts',
    'src/components/planning/PlanningDayView.tsx',
    'src/components/planning/PlanningWeekView.tsx',
    'src/components/planning/PlanningMonthView.tsx',
    'src/components/planning/MemberContactModal.tsx',
  ]);
}

export function readChantiersBundle(): string {
  return readFilesConcat([
    'src/pages/Chantiers.tsx',
    'src/hooks/useChantiersCatalog.ts',
    'src/lib/chantiersService.ts',
    'src/components/chantiers/ChantierCard.tsx',
    'src/components/chantiers/ChantierFormModal.tsx',
    'src/components/chantiers/ChantierAssignModal.tsx',
    'src/lib/formatters.ts',
  ]);
}

export function readChantierDetailBundle(): string {
  return readFilesConcat([
    'src/pages/ChantierDetail.tsx',
    'src/hooks/useChantierDetail.ts',
    'src/lib/chantiersService.ts',
    'src/components/chantiers/ChantierTeamSection.tsx',
    'src/components/chantiers/ChantierDocumentsSection.tsx',
    'src/components/chantiers/ChantierSupervisorPanel.tsx',
    'src/lib/formatters.ts',
  ]);
}

export function readHoursAnalyticsBundle(): string {
  return readFilesConcat([
    'src/components/common/HoursAnalyticsSection.tsx',
    'src/components/analytics/HoursBarChartSVG.tsx',
    'src/components/analytics/PointagesHistoryList.tsx',
    'src/lib/hoursAnalytics.ts',
    'src/lib/dates.ts',
  ]);
}

export function readPlusBundle(): string {
  return readFilesConcat([
    'src/pages/Plus.tsx',
    'src/hooks/usePlusDiagnostics.ts',
    'src/lib/formatters.ts',
  ]);
}

export function readAppLayoutBundle(): string {
  return readFilesConcat([
    'src/components/layout/AppLayout.tsx',
    'src/lib/formatters.ts',
  ]);
}

export function readChatBundle(): string {
  return readFilesConcat([
    'src/pages/ChatPreview.tsx',
    'src/data/mockChannels.ts',
    'src/components/modules/ChatRoomView.tsx',
  ]);
}
