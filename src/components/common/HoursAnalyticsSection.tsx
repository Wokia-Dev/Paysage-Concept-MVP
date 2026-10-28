import React, { useState, useMemo } from 'react';
import type { PointageLocal, Chantier } from '../../types/database';
import { formatHours, calculateNormalHours } from '../../lib/hours';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  CheckCircle2,
  CloudUpload,
  Calendar,
  ChevronDown,
  ChevronUp,
  Pencil,
  Sparkles,
} from 'lucide-react';

interface HoursAnalyticsSectionProps {
  pointages: PointageLocal[];
  chantiers: Chantier[];
  dailyTarget?: number;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onOpenSaisie: (dateStr?: string) => void;
}

export type PeriodMode = 'week' | 'month';

// Helper pour parser en UTC à midi (évite tout drift de fuseau ou heure d'été)
const parseMiddayUTC = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
};

const formatISODate = (d: Date): string => {
  return d.toISOString().slice(0, 10);
};

const getISOWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 12));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

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

  // Jour actif inspecté sur le graphique
  const [activeChartDate, setActiveChartDate] = useState<string>(selectedDateStr);

  const refDateObj = useMemo(() => parseMiddayUTC(refDateStr), [refDateStr]);

  // Map des chantiers par id pour lookup O(1)
  const chantierMap = useMemo(() => {
    const map = new Map<string, string>();
    chantiers.forEach((c) => {
      map.set(c.id, c.nom_client);
    });
    return map;
  }, [chantiers]);

  // Aujourd'hui en UTC
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }, []);

  // 1. Calcul de la plage de dates selon la période
  const { startDateStr, endDateStr, periodLabel, daysList } = useMemo(() => {
    if (periodMode === 'week') {
      const d = new Date(refDateObj);
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day; // Lundi de référence
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() + diff);

      const days: Array<{
        dateStr: string;
        dayName: string;
        dayNumber: number;
        monthName: string;
        isToday: boolean;
      }> = [];

      for (let i = 0; i < 7; i++) {
        const cur = new Date(monday);
        cur.setUTCDate(monday.getUTCDate() + i);
        const iso = formatISODate(cur);

        const dayName = new Intl.DateTimeFormat('fr-FR', {
          weekday: 'short',
          timeZone: 'UTC',
        })
          .format(cur)
          .replace('.', '')
          .slice(0, 3);

        const monthName = new Intl.DateTimeFormat('fr-FR', {
          month: 'short',
          timeZone: 'UTC',
        })
          .format(cur)
          .replace('.', '');

        days.push({
          dateStr: iso,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          dayNumber: cur.getUTCDate(),
          monthName,
          isToday: iso === todayStr,
        });
      }

      const weekNum = getISOWeekNumber(monday);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);

      const label = `Semaine ${weekNum} • ${monday.getUTCDate()} ${days[0].monthName}. – ${sunday.getUTCDate()} ${days[6].monthName}. ${sunday.getUTCFullYear()}`;

      return {
        startDateStr: days[0].dateStr,
        endDateStr: days[6].dateStr,
        periodLabel: label,
        daysList: days,
      };
    } else {
      // Mode Mois
      const year = refDateObj.getUTCFullYear();
      const month = refDateObj.getUTCMonth();

      const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
      const days: Array<{
        dateStr: string;
        dayName: string;
        dayNumber: number;
        monthName: string;
        isToday: boolean;
      }> = [];

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const cur = new Date(Date.UTC(year, month, dayNum, 12));
        const iso = formatISODate(cur);

        const dayName = new Intl.DateTimeFormat('fr-FR', {
          weekday: 'short',
          timeZone: 'UTC',
        })
          .format(cur)
          .replace('.', '')
          .slice(0, 3);

        const monthName = new Intl.DateTimeFormat('fr-FR', {
          month: 'short',
          timeZone: 'UTC',
        })
          .format(cur)
          .replace('.', '');

        days.push({
          dateStr: iso,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          dayNumber: dayNum,
          monthName,
          isToday: iso === todayStr,
        });
      }

      const monthLabel = new Intl.DateTimeFormat('fr-FR', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(refDateObj);

      const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

      return {
        startDateStr: days[0].dateStr,
        endDateStr: days[days.length - 1].dateStr,
        periodLabel: capitalizedMonth,
        daysList: days,
      };
    }
  }, [periodMode, refDateObj, todayStr]);

  // 2. Navigation de période (semaine précédente / suivante, mois précédent / suivant)
  const handlePrevPeriod = () => {
    const cur = new Date(refDateObj);
    if (periodMode === 'week') {
      cur.setUTCDate(cur.getUTCDate() - 7);
    } else {
      cur.setUTCMonth(cur.getUTCMonth() - 1);
    }
    setRefDateStr(formatISODate(cur));
  };

  const handleNextPeriod = () => {
    const cur = new Date(refDateObj);
    if (periodMode === 'week') {
      cur.setUTCDate(cur.getUTCDate() + 7);
    } else {
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    setRefDateStr(formatISODate(cur));
  };

  const handleJumpToday = () => {
    setRefDateStr(todayStr);
    setActiveChartDate(todayStr);
  };

  // 3. Filtrage et agrégation des pointages pour la période sélectionnée
  const periodPointages = useMemo(() => {
    return pointages.filter(
      (p) => p.date >= startDateStr && p.date <= endDateStr && Number(p.heures_totales) > 0
    );
  }, [pointages, startDateStr, endDateStr]);

  // Map des pointages par date pour un accès direct
  const pointageByDate = useMemo(() => {
    const map = new Map<string, PointageLocal>();
    pointages.forEach((p) => {
      if (p.date >= startDateStr && p.date <= endDateStr) {
        map.set(p.date, p);
      }
    });
    return map;
  }, [pointages, startDateStr, endDateStr]);

  // KPI Metrics
  const metrics = useMemo(() => {
    let totalHours = 0;
    let totalOvertime = 0;
    let totalPause = 0;
    let workedDaysCount = 0;

    periodPointages.forEach((p) => {
      const tot = Number(p.heures_totales) || 0;
      const sup = Number(p.heures_sup) || 0;
      const pause = Number(p.temps_pause) || 0;

      totalHours += tot;
      totalOvertime += sup;
      totalPause += pause;
      if (tot > 0) workedDaysCount++;
    });

    const normalHours = Math.max(0, totalHours - totalOvertime);

    return {
      totalHours,
      totalOvertime,
      totalPause,
      normalHours,
      workedDaysCount,
    };
  }, [periodPointages]);

  // Données du jour actif inspecté sur le graphique
  const activeDayData = useMemo(() => {
    const pt = pointageByDate.get(activeChartDate);
    const dayObj = daysList.find((d) => d.dateStr === activeChartDate);
    const tot = pt ? Number(pt.heures_totales) || 0 : 0;
    const sup = pt ? Number(pt.heures_sup) || 0 : 0;
    const pause = pt ? Number(pt.temps_pause) || 0 : 0;
    const norm = calculateNormalHours(tot, sup);
    const chantierName = pt?.chantier_id
      ? chantierMap.get(pt.chantier_id) || 'Chantier du jour'
      : 'Aucun chantier spécifié';

    let formattedDate = activeChartDate;
    if (dayObj) {
      try {
        const d = parseMiddayUTC(activeChartDate);
        formattedDate = new Intl.DateTimeFormat('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }).format(d);
        formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      } catch {
        formattedDate = activeChartDate;
      }
    }

    return {
      dateStr: activeChartDate,
      formattedDate,
      pointage: pt,
      tot,
      sup,
      pause,
      norm,
      chantierName,
      hasSubmitted: tot > 0,
    };
  }, [activeChartDate, pointageByDate, daysList, chantierMap]);

  // 4. Configuration géométrique du graphique SVG
  const chartHeight = 160;
  const chartWidth = 320;
  const paddingBottom = 26;
  const paddingTop = 20;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

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

  // Position Y de la ligne d'objectif journalier
  const targetY = paddingTop + usableHeight - (dailyTarget / maxHourValue) * usableHeight;

  // Liste triée des déclarations de la période (les plus récentes en premier)
  const sortedPeriodDeclarations = useMemo(() => {
    return [...periodPointages].sort((a, b) => b.date.localeCompare(a.date));
  }, [periodPointages]);

  return (
    <section className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-5">
      {/* 1. En-tête de section avec sélecteur de période */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-sable/40 pb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-foret" />
            Analyse & Historique des heures
          </h2>
          <p className="text-xs text-foret/70 font-medium mt-0.5">
            Suivi cumulé, heures supplémentaires et registre déclaratif
          </p>
        </div>

        {/* Toggle Semaine / Mois */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-craie border border-sable/80 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setPeriodMode('week');
              setActiveChartDate(refDateStr);
            }}
            className={`min-h-[36px] px-3.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              periodMode === 'week'
                ? 'bg-foret text-white shadow-xs'
                : 'text-foret/70 hover:text-foret hover:bg-sable/30'
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
                ? 'bg-foret text-white shadow-xs'
                : 'text-foret/70 hover:text-foret hover:bg-sable/30'
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* 2. Barre de Navigation Temporelle */}
      <div className="flex items-center justify-between bg-craie px-3.5 py-2.5 rounded-2xl border border-sable/60 shadow-2xs">
        <button
          type="button"
          onClick={handlePrevPeriod}
          className="min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-sable/50 border border-sable text-foret flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95"
          title={periodMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
          aria-label={periodMode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center px-2">
          <span className="text-xs font-bold text-foret block tracking-tight">
            {periodLabel}
          </span>
          <span className="text-[10px] text-sauge font-medium">
            Objectif de référence : {formatHours(dailyTarget)} / jour
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {todayStr < startDateStr || todayStr > endDateStr ? (
            <button
              type="button"
              onClick={handleJumpToday}
              className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-xl bg-white hover:bg-sable/50 border border-sable text-foret transition-colors cursor-pointer hidden xs:inline-flex items-center shadow-2xs"
            >
              Aujourd'hui
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleNextPeriod}
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white hover:bg-sable/50 border border-sable text-foret flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95"
            title={periodMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
            aria-label={periodMode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Synthèse des Métriques Clés (KPI Cards) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Heures */}
        <div className="bg-craie rounded-2xl p-3 border border-sable/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sauge">
              Total travaillé
            </span>
            <Clock className="w-3.5 h-3.5 text-foret" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-foret block leading-none">
              {formatHours(metrics.totalHours)}
            </span>
            <span className="text-[10px] text-sauge font-medium mt-1 block">
              {metrics.workedDaysCount} jour{metrics.workedDaysCount > 1 ? 's' : ''} déclaré{metrics.workedDaysCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Heures Supplémentaires */}
        <div className="bg-terracotta/5 rounded-2xl p-3 border border-terracotta/20 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta">
              Heures sup.
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-terracotta" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-terracotta block leading-none">
              {formatHours(metrics.totalOvertime)}
            </span>
            <span className="text-[10px] text-terracotta/80 font-medium mt-1 block">
              {metrics.totalOvertime > 0 ? `dont ${formatHours(metrics.totalOvertime)} sup` : 'Aucune sup.'}
            </span>
          </div>
        </div>

        {/* Temps de Pause */}
        <div className="bg-craie rounded-2xl p-3 border border-sable/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sauge">
              Total pauses
            </span>
            <Sparkles className="w-3.5 h-3.5 text-sauge" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black text-foret/80 block leading-none">
              {formatHours(metrics.totalPause)}
            </span>
            <span className="text-[10px] text-sauge font-medium mt-1 block">
              Temps de pause
            </span>
          </div>
        </div>
      </div>

      {/* 4. Graphique Visuel Interactif (SVG Réactif) */}
      <div className="bg-craie rounded-2xl p-4 border border-sable/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-foret flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-foret inline-block" />
              Normales
            </span>
            <span className="font-bold text-terracotta flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-terracotta inline-block" />
              Heures sup
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-sauge font-medium">
            <span className="w-3 border-t-2 border-dashed border-sauge inline-block" />
            <span>Obj. {formatHours(dailyTarget)}</span>
          </div>
        </div>

        {/* Conteneur SVG du graphique */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-44 overflow-visible"
            aria-label="Graphique des heures déclarées"
          >
            {/* Lignes de repère horizontales */}
            <line
              x1="0"
              y1={paddingTop + usableHeight}
              x2={chartWidth}
              y2={paddingTop + usableHeight}
              stroke="#E8E3D9"
              strokeWidth="1"
            />

            {/* Ligne pointillée de l'objectif journalier */}
            <line
              x1="0"
              y1={targetY}
              x2={chartWidth}
              y2={targetY}
              stroke="#8FA98F"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* Barres par jour */}
            {daysList.map((day, idx) => {
              const pt = pointageByDate.get(day.dateStr);
              const totalVal = pt ? Number(pt.heures_totales) || 0 : 0;
              const supVal = pt ? Number(pt.heures_sup) || 0 : 0;
              const normVal = calculateNormalHours(totalVal, supVal);

              const normHeight = (normVal / maxHourValue) * usableHeight;
              const supHeight = (supVal / maxHourValue) * usableHeight;

              const isWeek = periodMode === 'week';
              const colWidth = isWeek ? 34 : Math.max(6, (chartWidth - 20) / daysList.length - 2);
              const colGap = isWeek ? (chartWidth - 7 * colWidth) / 8 : 2;
              const xPos = isWeek
                ? colGap + idx * (colWidth + colGap)
                : 10 + idx * (colWidth + colGap);

              const isSelected = day.dateStr === activeChartDate;

              return (
                <g
                  key={day.dateStr}
                  className="cursor-pointer transition-opacity"
                  onClick={() => setActiveChartDate(day.dateStr)}
                >
                  {/* Piste d'arrière-plan de la colonne */}
                  <rect
                    x={xPos}
                    y={paddingTop}
                    width={colWidth}
                    height={usableHeight}
                    rx={isWeek ? 4 : 2}
                    fill={isSelected ? '#E8E3D9' : '#F5F2EB'}
                    className="transition-colors hover:fill-sable/80"
                  />

                  {/* Segment Normal (Vert Forêt) */}
                  {normHeight > 0 && (
                    <rect
                      x={xPos}
                      y={paddingTop + usableHeight - normHeight}
                      width={colWidth}
                      height={normHeight}
                      rx={supHeight > 0 ? 0 : isWeek ? 4 : 2}
                      fill="#15302F"
                    />
                  )}

                  {/* Segment Heures Sup (Terracotta) */}
                  {supHeight > 0 && (
                    <rect
                      x={xPos}
                      y={paddingTop + usableHeight - normHeight - supHeight}
                      width={colWidth}
                      height={supHeight}
                      rx={isWeek ? 4 : 2}
                      fill="#C47452"
                    />
                  )}

                  {/* Étiquettes de l'axe X (Jour de semaine ou repères de dates) */}
                  {isWeek ? (
                    <text
                      x={xPos + colWidth / 2}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      className={`text-[10px] font-bold ${
                        isSelected ? 'fill-foret font-black' : 'fill-foret/70'
                      }`}
                    >
                      {day.dayName.slice(0, 1)} {day.dayNumber}
                    </text>
                  ) : (
                    // Pour le mois : repères tous les 5 jours ou 1er du mois
                    (day.dayNumber === 1 || day.dayNumber % 5 === 0) && (
                      <text
                        x={xPos + colWidth / 2}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        className="text-[9px] font-bold fill-foret/60"
                      >
                        {day.dayNumber}
                      </text>
                    )
                  )}

                  {/* Indicateur Aujourd'hui */}
                  {day.isToday && (
                    <circle
                      cx={xPos + colWidth / 2}
                      cy={chartHeight - 2}
                      r="2"
                      fill="#C47452"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 4.b Fiche d'inspection du jour sélectionné sur le graphique */}
        <div className="bg-white rounded-2xl p-3.5 border border-sable flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foret">
                {activeDayData.formattedDate}
              </span>
              {activeDayData.dateStr === todayStr && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable/50 text-foret">
                  Aujourd'hui
                </span>
              )}
            </div>

            <p className="text-[11px] text-sauge font-medium mt-0.5">
              {activeDayData.chantierName}
            </p>

            <div className="flex items-center gap-2 mt-1.5 text-xs">
              {activeDayData.hasSubmitted ? (
                <>
                  <span className="font-extrabold text-foret">
                    {formatHours(activeDayData.tot)}
                  </span>
                  <span className="text-foret/60 font-medium">
                    ({formatHours(activeDayData.norm)} normales
                    {activeDayData.sup > 0 && ` + ${formatHours(activeDayData.sup)} sup`})
                  </span>
                  {activeDayData.pause > 0 && (
                    <span className="text-sauge font-medium">
                      • Pause : {formatHours(activeDayData.pause)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-foret/50 italic font-medium">
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
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-foret hover:bg-foret/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-sable" />
              <span>{activeDayData.hasSubmitted ? 'Modifier' : 'Saisir'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Registre Détaillé de l'Historique (Collapsible / Déroulant) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-foret uppercase tracking-wider">
              Détail des déclarations
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable/50 text-foret">
              {sortedPeriodDeclarations.length}
            </span>
          </div>

          {sortedPeriodDeclarations.length > 3 && (
            <button
              type="button"
              onClick={() => setIsHistoryExpanded((prev) => !prev)}
              className="text-xs font-bold text-foret/70 hover:text-foret flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{isHistoryExpanded ? 'Réduire' : 'Afficher tout'}</span>
              {isHistoryExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {sortedPeriodDeclarations.length === 0 ? (
          <div className="p-6 bg-craie rounded-2xl border border-sable/60 text-center text-xs text-foret/60 space-y-1">
            <Calendar className="w-5 h-5 mx-auto text-sauge/60" />
            <p className="font-medium">Aucune déclaration trouvée pour cette période.</p>
            <p className="text-[11px] text-sauge">
              Sélectionnez une date ci-dessus ou cliquez sur « + Saisir des heures ».
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(isHistoryExpanded
              ? sortedPeriodDeclarations
              : sortedPeriodDeclarations.slice(0, 3)
            ).map((pt) => {
              const tot = Number(pt.heures_totales) || 0;
              const sup = Number(pt.heures_sup) || 0;
              const pause = Number(pt.temps_pause) || 0;
              const chantierName = pt.chantier_id
                ? chantierMap.get(pt.chantier_id) || 'Chantier du jour'
                : 'Chantier non spécifié';

              let dateDisplay: string;
              try {
                const d = parseMiddayUTC(pt.date);
                const formatted = new Intl.DateTimeFormat('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(d);
                dateDisplay = formatted.charAt(0).toUpperCase() + formatted.slice(1);
              } catch {
                dateDisplay = pt.date;
              }

              return (
                <div
                  key={pt.id}
                  onClick={() => {
                    onSelectDate(pt.date);
                    onOpenSaisie(pt.date);
                  }}
                  className="p-3.5 bg-craie hover:bg-white rounded-2xl border border-sable/70 hover:border-sauge transition-all cursor-pointer shadow-2xs hover:shadow-soft flex items-center justify-between gap-3 active:scale-[0.99] group"
                >
                  {/* Côté gauche : Date et nom du chantier */}
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-foret block truncate">
                      {dateDisplay}
                    </span>
                    <span className="text-[11px] text-sauge font-medium block truncate">
                      {chantierName}
                    </span>
                    {pause > 0 && (
                      <span className="text-[10px] text-foret/60 font-medium block">
                        Temps de pause : {formatHours(pause)}
                      </span>
                    )}
                  </div>

                  {/* Côté droit : Heures travaillées, badge sup et synchro */}
                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-sable shadow-2xs">
                        <span className="text-xs font-extrabold text-foret">
                          {formatHours(tot)}
                        </span>
                        {sup > 0 && (
                          <span className="text-[10px] font-bold text-terracotta">
                            (dont {formatHours(sup)} sup)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1 text-[10px] font-medium">
                        {pt.synced ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Synchronisé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <CloudUpload className="w-3 h-3 text-amber-600 animate-pulse" />
                            En attente
                          </span>
                        )}
                      </div>
                    </div>

                    <Pencil className="w-4 h-4 text-sauge/60 group-hover:text-foret transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
