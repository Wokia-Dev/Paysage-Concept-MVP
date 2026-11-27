import type { Chantier, PointageLocal } from '../types/database';
import { calculateNormalHours } from './hours.ts';
import {
  formatFrenchMonthYear,
  formatFrenchWeekdayDate,
  formatISODate,
  getISOWeekNumber,
  getWeekMonday,
  parseMiddayUTC,
} from './dates.ts';

export type PeriodMode = 'week' | 'month';

export interface AnalyticsDayItem {
  dateStr: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

export interface AnalyticsPeriodRange {
  startDateStr: string;
  endDateStr: string;
  periodLabel: string;
  daysList: AnalyticsDayItem[];
}

export interface AnalyticsPeriodMetrics {
  totalHours: number;
  totalOvertime: number;
  totalPause: number;
  normalHours: number;
  workedDaysCount: number;
}

export interface ActiveDayInspection {
  dateStr: string;
  formattedDate: string;
  pointage: PointageLocal | undefined;
  tot: number;
  sup: number;
  pause: number;
  norm: number;
  chantierName: string;
  hasSubmitted: boolean;
}

/**
 * Calcule la plage calendaire (Semaine ISO ou Mois) autour d'une date de référence.
 */
export function computeAnalyticsPeriod(
  periodMode: PeriodMode,
  refDateStr: string,
  todayStr: string
): AnalyticsPeriodRange {
  const refDateObj = parseMiddayUTC(refDateStr);

  if (periodMode === 'week') {
    const monday = getWeekMonday(refDateObj);
    const days: AnalyticsDayItem[] = [];

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
  }

  const year = refDateObj.getUTCFullYear();
  const month = refDateObj.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const days: AnalyticsDayItem[] = [];

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

  return {
    startDateStr: days[0].dateStr,
    endDateStr: days[days.length - 1].dateStr,
    periodLabel: formatFrenchMonthYear(refDateObj, 'UTC'),
    daysList: days,
  };
}

/**
 * Décale une date de référence d'une semaine ou d'un mois.
 */
export function shiftAnalyticsRefDate(
  refDateStr: string,
  periodMode: PeriodMode,
  direction: -1 | 1
): string {
  const cur = parseMiddayUTC(refDateStr);
  if (periodMode === 'week') {
    cur.setUTCDate(cur.getUTCDate() + direction * 7);
  } else {
    cur.setUTCMonth(cur.getUTCMonth() + direction);
  }
  return formatISODate(cur);
}

/**
 * Calcule les indicateurs KPI cumulés pour une liste de pointages d'une période.
 */
export function computeAnalyticsMetrics(periodPointages: PointageLocal[]): AnalyticsPeriodMetrics {
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
}

/**
 * Compte le nombre de jours ouvrés (lundi à vendredi) dans une liste de jours de période.
 */
export function countWorkdaysInPeriod(daysList: AnalyticsDayItem[]): number {
  let count = 0;
  for (const day of daysList) {
    const utcDay = parseMiddayUTC(day.dateStr).getUTCDay();
    if (utcDay >= 1 && utcDay <= 5) {
      count++;
    }
  }
  return count;
}

/**
 * Calcule l'objectif d'heures cumulé sur une période :
 * nombre de jours ouvrés (Lun–Ven) × objectif journalier.
 */
export function computePeriodTargetHours(
  daysList: AnalyticsDayItem[],
  dailyTarget: number
): { workdaysCount: number; targetHours: number } {
  const safeTarget = Number.isFinite(dailyTarget) ? Math.max(0, dailyTarget) : 0;
  const workdaysCount = countWorkdaysInPeriod(daysList);
  const targetHours = Math.round(workdaysCount * safeTarget * 100) / 100;
  return { workdaysCount, targetHours };
}

/**
 * Construit les détails d'inspection pour un jour sélectionné sur le graphique.
 */
export function buildActiveDayData(
  activeChartDate: string,
  pointageByDate: Map<string, PointageLocal>,
  daysList: AnalyticsDayItem[],
  chantierMap: Map<string, string>
): ActiveDayInspection {
  const pt = pointageByDate.get(activeChartDate);
  const dayObj = daysList.find((d) => d.dateStr === activeChartDate);
  const tot = pt ? Number(pt.heures_totales) || 0 : 0;
  const sup = pt ? Number(pt.heures_sup) || 0 : 0;
  const pause = pt ? Number(pt.temps_pause) || 0 : 0;
  const norm = calculateNormalHours(tot, sup);
  const chantierName = pt?.chantier_id
    ? chantierMap.get(pt.chantier_id) || 'Chantier du jour'
    : 'Aucun chantier spécifié';

  const formattedDate = dayObj ? formatFrenchWeekdayDate(activeChartDate) : activeChartDate;

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
}

/**
 * Construit une map id -> nom_client pour un accès O(1).
 */
export function buildChantierNameMap(chantiers: Chantier[]): Map<string, string> {
  const map = new Map<string, string>();
  chantiers.forEach((c) => {
    map.set(c.id, c.nom_client);
  });
  return map;
}
