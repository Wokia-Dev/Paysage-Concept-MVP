import React from 'react';
import { Pencil } from 'lucide-react';
import type { PointageLocal } from '../../types/database';
import { calculateNormalHours, formatHours } from '../../lib/hours';
import { useTheme } from '../../context/useTheme';
import type {
  ActiveDayInspection,
  AnalyticsDayItem,
  PeriodMode,
} from '../../lib/hoursAnalytics';

interface HoursBarChartSVGProps {
  periodMode: PeriodMode;
  daysList: AnalyticsDayItem[];
  pointageByDate: Map<string, PointageLocal>;
  dailyTarget: number;
  activeChartDate: string;
  activeDayData: ActiveDayInspection;
  todayStr: string;
  maxHourValue: number;
  onSelectChartDate: (dateStr: string) => void;
  onSelectDate: (dateStr: string) => void;
  onOpenSaisie: (dateStr?: string) => void;
}

const CHART_HEIGHT = 160;
const CHART_WIDTH = 320;
const PADDING_BOTTOM = 26;
const PADDING_TOP = 20;
const USABLE_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

export const HoursBarChartSVG: React.FC<HoursBarChartSVGProps> = ({
  periodMode,
  daysList,
  pointageByDate,
  dailyTarget,
  activeChartDate,
  activeDayData,
  todayStr,
  maxHourValue,
  onSelectChartDate,
  onSelectDate,
  onOpenSaisie,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Position Y de la ligne d'objectif journalier
  const targetY = PADDING_TOP + USABLE_HEIGHT - (dailyTarget / maxHourValue) * USABLE_HEIGHT;

  const axisLineColor = isDark ? '#304744' : '#E8E3D9';
  const targetLineColor = isDark ? '#9BB89B' : '#8FA98F';
  const trackSelectedColor = isDark ? '#2B423F' : '#E8E3D9';
  const trackIdleColor = isDark ? '#172322' : '#F5F2EB';
  const normalBarColor = isDark ? '#3B8B80' : '#15302F';
  const overtimeBarColor = isDark ? '#E38D69' : '#C47452';

  return (
    <div className="bg-craie dark:bg-[#1E2E2C] rounded-2xl p-4 border border-sable/80 dark:border-[#304744] shadow-2xs space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-foret dark:text-[#EDF2F0] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-foret dark:bg-[#3B8B80] inline-block" />
            Normales
          </span>
          <span className="font-bold text-terracotta dark:text-[#E38D69] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-terracotta dark:bg-[#E38D69] inline-block" />
            Heures sup
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-sauge dark:text-[#9BB89B] font-medium">
          <span className="w-3 border-t-2 border-dashed border-sauge dark:border-[#9BB89B] inline-block" />
          <span>Obj. {formatHours(dailyTarget)}</span>
        </div>
      </div>

      {/* Conteneur SVG du graphique */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-44 overflow-visible"
          aria-label="Graphique des heures déclarées"
        >
          {/* Lignes de repère horizontales */}
          <line
            x1="0"
            y1={PADDING_TOP + USABLE_HEIGHT}
            x2={CHART_WIDTH}
            y2={PADDING_TOP + USABLE_HEIGHT}
            stroke={axisLineColor}
            strokeWidth="1"
          />

          {/* Ligne pointillée de l'objectif journalier */}
          <line
            x1="0"
            y1={targetY}
            x2={CHART_WIDTH}
            y2={targetY}
            stroke={targetLineColor}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Barres par jour */}
          {daysList.map((day, idx) => {
            const pt = pointageByDate.get(day.dateStr);
            const totalVal = pt ? Number(pt.heures_totales) || 0 : 0;
            const supVal = pt ? Number(pt.heures_sup) || 0 : 0;
            const normVal = calculateNormalHours(totalVal, supVal);

            const normHeight = (normVal / maxHourValue) * USABLE_HEIGHT;
            const supHeight = (supVal / maxHourValue) * USABLE_HEIGHT;

            const isWeek = periodMode === 'week';
            const colWidth = isWeek ? 34 : Math.max(6, (CHART_WIDTH - 20) / daysList.length - 2);
            const colGap = isWeek ? (CHART_WIDTH - 7 * colWidth) / 8 : 2;
            const xPos = isWeek
              ? colGap + idx * (colWidth + colGap)
              : 10 + idx * (colWidth + colGap);

            const isSelected = day.dateStr === activeChartDate;

            return (
              <g
                key={day.dateStr}
                className="cursor-pointer transition-opacity"
                onClick={() => onSelectChartDate(day.dateStr)}
              >
                {/* Piste d'arrière-plan de la colonne */}
                <rect
                  x={xPos}
                  y={PADDING_TOP}
                  width={colWidth}
                  height={USABLE_HEIGHT}
                  rx={isWeek ? 4 : 2}
                  fill={isSelected ? trackSelectedColor : trackIdleColor}
                  className="transition-colors hover:fill-sable/80 dark:hover:fill-[#263A37]"
                />

                {/* Segment Normal (Vert Forêt) */}
                {normHeight > 0 && (
                  <rect
                    x={xPos}
                    y={PADDING_TOP + USABLE_HEIGHT - normHeight}
                    width={colWidth}
                    height={normHeight}
                    rx={supHeight > 0 ? 0 : isWeek ? 4 : 2}
                    fill={normalBarColor}
                  />
                )}

                {/* Segment Heures Sup (Terracotta) */}
                {supHeight > 0 && (
                  <rect
                    x={xPos}
                    y={PADDING_TOP + USABLE_HEIGHT - normHeight - supHeight}
                    width={colWidth}
                    height={supHeight}
                    rx={isWeek ? 4 : 2}
                    fill={overtimeBarColor}
                  />
                )}

                {/* Étiquettes de l'axe X */}
                {isWeek ? (
                  <text
                    x={xPos + colWidth / 2}
                    y={CHART_HEIGHT - 8}
                    textAnchor="middle"
                    className={`text-[10px] font-bold ${
                      isSelected
                        ? 'fill-foret dark:fill-[#EDF2F0] font-black'
                        : 'fill-foret/70 dark:fill-[#9BB89B]'
                    }`}
                  >
                    {day.dayName.slice(0, 1)} {day.dayNumber}
                  </text>
                ) : (
                  (day.dayNumber === 1 || day.dayNumber % 5 === 0) && (
                    <text
                      x={xPos + colWidth / 2}
                      y={CHART_HEIGHT - 8}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-foret/60 dark:fill-[#9BB89B]"
                    >
                      {day.dayNumber}
                    </text>
                  )
                )}

                {/* Indicateur Aujourd'hui */}
                {day.isToday && (
                  <circle cx={xPos + colWidth / 2} cy={CHART_HEIGHT - 2} r="2" fill={overtimeBarColor} />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Fiche d'inspection du jour sélectionné sur le graphique */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl p-3.5 border border-sable dark:border-[#304744] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foret dark:text-[#EDF2F0]">{activeDayData.formattedDate}</span>
            {activeDayData.dateStr === todayStr && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable/50 text-foret dark:bg-[#263A37] dark:text-[#D5E6DC]">
                Aujourd'hui
              </span>
            )}
          </div>

          <p className="text-[11px] text-sauge dark:text-[#9BB89B] font-medium mt-0.5">{activeDayData.chantierName}</p>

          <div className="flex items-center gap-2 mt-1.5 text-xs">
            {activeDayData.hasSubmitted ? (
              <>
                <span className="font-extrabold text-foret dark:text-[#EDF2F0]">{formatHours(activeDayData.tot)}</span>
                <span className="text-foret/60 dark:text-[#B8C7C2] font-medium">
                  ({formatHours(activeDayData.norm)} normales
                  {activeDayData.sup > 0 && ` + ${formatHours(activeDayData.sup)} sup`})
                </span>
                {activeDayData.pause > 0 && (
                  <span className="text-sauge dark:text-[#9BB89B] font-medium">
                    • Pause : {formatHours(activeDayData.pause)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-foret/50 dark:text-[#8FA5A0] italic font-medium">
                Aucune heure déclarée pour ce jour (0h00)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectDate(activeDayData.dateStr);
              onOpenSaisie(activeDayData.dateStr);
            }}
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Pencil className="w-3 h-3 text-sable dark:text-[#D5E6DC]" />
            <span>{activeDayData.hasSubmitted ? 'Modifier' : 'Saisir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
