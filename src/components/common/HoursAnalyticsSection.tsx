import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Clock, Target, TrendingUp } from 'lucide-react';
import type { Chantier, PointageLocal } from '../../types/database';
import { formatHours } from '../../lib/hours';
import { getTodayDateString } from '../../lib/dates';
import {
  buildActiveDayData,
  buildChantierNameMap,
  computeAnalyticsMetrics,
  computeAnalyticsPeriod,
  computePeriodTargetHours,
  shiftAnalyticsRefDate,
  type PeriodMode,
} from '../../lib/hoursAnalytics';
import { HoursBarChartSVG } from '../analytics/HoursBarChartSVG';
import { PointagesHistoryList } from '../analytics/PointagesHistoryList';

export type { PeriodMode };

interface HoursAnalyticsSectionProps {
  pointages: PointageLocal[];
  chantiers: Chantier[];
  dailyTarget?: number;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onOpenSaisie: (dateStr?: string) => void;
}

export const HoursAnalyticsSection: React.FC<HoursAnalyticsSectionProps> = ({
  pointages,
  chantiers,
  dailyTarget = 7,
  selectedDateStr,
  onSelectDate,
  onOpenSaisie,
}) => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('week');
  const [refDateStr, setRefDateStr] = useState<string>(selectedDateStr);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);
  const [activeChartDate, setActiveChartDate] = useState<string>(selectedDateStr);
  const [prevSelectedDate, setPrevSelectedDate] = useState<string>(selectedDateStr);

  // Synchroniser l'analytique quand la date sélectionnée depuis WeeklyCalendarStrip change
  if (selectedDateStr !== prevSelectedDate) {
    setPrevSelectedDate(selectedDateStr);
    setRefDateStr(selectedDateStr);
    setActiveChartDate(selectedDateStr);
  }

  const todayStr = useMemo(() => getTodayDateString(0), []);
  const chantierMap = useMemo(() => buildChantierNameMap(chantiers), [chantiers]);

  const { startDateStr, endDateStr, periodLabel, daysList } = useMemo(
    () => computeAnalyticsPeriod(periodMode, refDateStr, todayStr),
    [periodMode, refDateStr, todayStr]
  );

  const handlePrevPeriod = () => {
    setRefDateStr((prev) => shiftAnalyticsRefDate(prev, periodMode, -1));
  };

  const handleNextPeriod = () => {
    setRefDateStr((prev) => shiftAnalyticsRefDate(prev, periodMode, 1));
  };

  const handleJumpToday = () => {
    setRefDateStr(todayStr);
    setActiveChartDate(todayStr);
  };

  const periodPointages = useMemo(() => {
    return pointages.filter(
      (p) => p.date >= startDateStr && p.date <= endDateStr && Number(p.heures_totales) > 0
    );
  }, [pointages, startDateStr, endDateStr]);

  const pointageByDate = useMemo(() => {
    const map = new Map<string, PointageLocal>();
    pointages.forEach((p) => {
      if (p.date >= startDateStr && p.date <= endDateStr) {
        map.set(p.date, p);
      }
    });
    return map;
  }, [pointages, startDateStr, endDateStr]);

  const metrics = useMemo(() => computeAnalyticsMetrics(periodPointages), [periodPointages]);
  const periodTarget = useMemo(
    () => computePeriodTargetHours(daysList, dailyTarget),
    [daysList, dailyTarget]
  );

  const activeDayData = useMemo(
    () => buildActiveDayData(activeChartDate, pointageByDate, daysList, chantierMap),
    [activeChartDate, pointageByDate, daysList, chantierMap]
  );

  const maxHourValue = useMemo(() => {
    let max = dailyTarget * 1.25;
    daysList.forEach((d) => {
      const pt = pointageByDate.get(d.dateStr);
      if (pt) {
        const val = Number(pt.heures_totales) || 0;
        if (val > max) max = val;
      }
    });
    return Math.max(10, Math.ceil(max));
  }, [dailyTarget, daysList, pointageByDate]);

  const sortedPeriodDeclarations = useMemo(() => {
    return [...periodPointages].sort((a, b) => b.date.localeCompare(a.date));
  }, [periodPointages]);

  return (
    <section className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-5">
      {/* 1. En-tête de section avec sélecteur de période */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-sable/40 dark:border-[#2A3F3C] pb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
            Analyse & Historique des heures
          </h2>
          <p className="text-xs text-foret/70 dark:text-[#B8C7C2] font-medium mt-0.5">
            Suivi cumulé, heures supplémentaires et registre déclaratif
          </p>
        </div>

        {/* Toggle Semaine / Mois */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-craie dark:bg-[#1E2E2C] border border-sable/80 dark:border-[#304744] shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setPeriodMode('week');
              setActiveChartDate(refDateStr);
            }}
            className={`min-h-[36px] px-3.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              periodMode === 'week'
                ? 'bg-foret text-white shadow-xs dark:bg-[#235852]'
                : 'text-foret/70 hover:text-foret hover:bg-sable/30 dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0] dark:hover:bg-[#263A37]'
            }`}
          >
            Semaine
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriodMode('month');
              setActiveChartDate(refDateStr);
            }}
            className={`min-h-[36px] px-3.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              periodMode === 'month'
                ? 'bg-foret text-white shadow-xs dark:bg-[#235852]'
                : 'text-foret/70 hover:text-foret hover:bg-sable/30 dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0] dark:hover:bg-[#263A37]'
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* 2. Barre de Navigation Temporelle */}
      <div className="flex items-center justify-between bg-craie dark:bg-[#1E2E2C] px-3.5 py-2.5 rounded-2xl border border-sable/60 dark:border-[#304744] shadow-2xs">
        <button
          type="button"
          onClick={handlePrevPeriod}
          className="min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-sable/50 border border-sable text-foret flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95 dark:bg-[#172322] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
          title={periodMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
          aria-label={periodMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center px-2">
          <span className="text-xs font-bold text-foret dark:text-[#EDF2F0] block tracking-tight">{periodLabel}</span>
          <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium">
            Objectif de référence : {formatHours(dailyTarget)} / jour
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {todayStr < startDateStr || todayStr > endDateStr ? (
            <button
              type="button"
              onClick={handleJumpToday}
              className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-xl bg-white hover:bg-sable/50 border border-sable text-foret transition-colors cursor-pointer hidden xs:inline-flex items-center shadow-2xs dark:bg-[#172322] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
            >
              Aujourd'hui
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleNextPeriod}
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-sable/50 border border-sable text-foret flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95 dark:bg-[#172322] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
            title={periodMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
            aria-label={periodMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Synthèse des Métriques Clés (KPI Cards) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-craie dark:bg-[#1E2E2C] rounded-2xl p-3 border border-sable/80 dark:border-[#304744] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B]">
              Total travaillé
            </span>
            <Clock className="w-3.5 h-3.5 text-foret dark:text-[#9BB89B]" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-foret dark:text-[#EDF2F0] block leading-none">
              {formatHours(metrics.totalHours)}
            </span>
            <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium mt-1 block">
              {metrics.workedDaysCount} jour{metrics.workedDaysCount > 1 ? 's' : ''} déclaré
              {metrics.workedDaysCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="bg-terracotta/5 dark:bg-[#2A1D19] rounded-2xl p-3 border border-terracotta/20 dark:border-terracotta/40 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta dark:text-[#E38D69]">
              Heures sup.
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69]" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-terracotta dark:text-[#E38D69] block leading-none">
              {formatHours(metrics.totalOvertime)}
            </span>
            <span className="text-[10px] text-terracotta/80 dark:text-[#E8A082] font-medium mt-1 block">
              {metrics.totalOvertime > 0 ? `dont ${formatHours(metrics.totalOvertime)} sup` : 'Aucune sup.'}
            </span>
          </div>
        </div>

        <div className="bg-craie dark:bg-[#1E2E2C] rounded-2xl p-3 border border-sable/80 dark:border-[#304744] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B]">
              Objectif
            </span>
            <Target className="w-3.5 h-3.5 text-foret dark:text-[#9BB89B]" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-foret dark:text-[#EDF2F0] block leading-none">
              {formatHours(periodTarget.targetHours)}
            </span>
            <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium mt-1 block">
              {periodTarget.workdaysCount} j ouvrés × {formatHours(dailyTarget)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Graphique Visuel Interactif (SVG Réactif) */}
      <HoursBarChartSVG
        periodMode={periodMode}
        daysList={daysList}
        pointageByDate={pointageByDate}
        dailyTarget={dailyTarget}
        activeChartDate={activeChartDate}
        activeDayData={activeDayData}
        todayStr={todayStr}
        maxHourValue={maxHourValue}
        onSelectChartDate={setActiveChartDate}
        onSelectDate={onSelectDate}
        onOpenSaisie={onOpenSaisie}
      />

      {/* 5. Registre Détaillé de l'Historique */}
      <PointagesHistoryList
        sortedPeriodDeclarations={sortedPeriodDeclarations}
        chantierMap={chantierMap}
        isHistoryExpanded={isHistoryExpanded}
        onToggleExpand={() => setIsHistoryExpanded((prev) => !prev)}
        onSelectDate={onSelectDate}
        onOpenSaisie={onOpenSaisie}
      />
    </section>
  );
};
