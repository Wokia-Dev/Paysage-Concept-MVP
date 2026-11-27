import type { Affectation, Chantier } from '../types/database';
import {
  formatISODate,
  getTodayDateString,
  getWeekMonday,
  parseMiddayUTC,
} from './dates.ts';

export type ApplyPeriodMode = 'add' | 'replace';

export interface WeekdayOption {
  day: number; // 0 = Dimanche, 1 = Lundi ... 6 = Samedi (Date.getUTCDay)
  short: string;
  label: string;
}

export const WEEKDAY_OPTIONS: readonly WeekdayOption[] = [
  { day: 1, short: 'L', label: 'Lun' },
  { day: 2, short: 'M', label: 'Mar' },
  { day: 3, short: 'M', label: 'Mer' },
  { day: 4, short: 'J', label: 'Jeu' },
  { day: 5, short: 'V', label: 'Ven' },
  { day: 6, short: 'S', label: 'Sam' },
  { day: 0, short: 'D', label: 'Dim' },
];

export const DEFAULT_WORKDAYS: readonly number[] = [1, 2, 3, 4, 5];

export const MAX_EXPANDED_PERIOD_DAYS = 90;

export interface PeriodRange {
  startDate: string;
  endDate: string;
}

export interface OtherChantierConflict {
  chantierId: string;
  nomClient: string;
  count: number;
  dates: string[];
}

export interface PeriodWorkerStats {
  assignedCount: number;
  totalDays: number;
  isFullyAssigned: boolean;
  isPartiallyAssigned: boolean;
  otherChantiers: OtherChantierConflict[];
}

export interface NewAffectationInput {
  chantier_id: string;
  profile_id: string;
  date_intervention: string;
}

export interface PeriodDiffResult {
  toAdd: NewAffectationInput[];
  toRemoveIds: string[];
}

/**
 * Retourne la période par défaut (Lundi -> Vendredi) d'une semaine relative à aujourd'hui.
 */
export function getWeekPeriod(
  weekOffset = 0,
  todayStr = getTodayDateString(0)
): PeriodRange {
  const monday = getWeekMonday(parseMiddayUTC(todayStr));
  if (weekOffset !== 0) {
    monday.setUTCDate(monday.getUTCDate() + weekOffset * 7);
  }
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  return {
    startDate: formatISODate(monday),
    endDate: formatISODate(friday),
  };
}

/**
 * Détermine la plage de dates proposée par défaut pour un chantier :
 * - [date_debut, date_fin] si les deux bornes sont valides
 * - [date_debut, date_debut] si seule date_debut est définie
 * - La semaine courante (Lun -> Ven) sinon
 */
export function getDefaultPeriodForChantier(
  chantier: Pick<Chantier, 'date_debut' | 'date_fin'>,
  todayStr = getTodayDateString(0)
): PeriodRange {
  const start = chantier.date_debut?.trim() || '';
  const end = chantier.date_fin?.trim() || '';

  if (start && end && start <= end) {
    return { startDate: start, endDate: end };
  }
  if (start && !end) {
    return { startDate: start, endDate: start };
  }
  if (!start && end) {
    const fallbackStart = todayStr <= end ? todayStr : end;
    return { startDate: fallbackStart, endDate: end };
  }
  return getWeekPeriod(0, todayStr);
}

/**
 * Choisit la date journalière initiale la plus pertinente à l'ouverture d'un chantier.
 */
export function getInitialDailyDateForChantier(
  chantier: Pick<Chantier, 'date_debut' | 'date_fin'>,
  todayStr = getTodayDateString(0)
): string {
  const { startDate, endDate } = getDefaultPeriodForChantier(chantier, todayStr);
  if (todayStr >= startDate && todayStr <= endDate) {
    return todayStr;
  }
  return startDate;
}

/**
 * Développe une plage [startDate, endDate] en liste ordonnée de dates YYYY-MM-DD
 * filtrées par jours de semaine actifs (avec garde-fou maxDays).
 */
export function expandDateRange(
  startDate: string,
  endDate: string,
  activeWeekdays: readonly number[] = DEFAULT_WORKDAYS,
  maxDays = MAX_EXPANDED_PERIOD_DAYS
): { dates: string[]; truncated: boolean } {
  if (!startDate || !endDate || startDate > endDate || activeWeekdays.length === 0) {
    return { dates: [], truncated: false };
  }

  const allowedSet = new Set(activeWeekdays);
  const startObj = parseMiddayUTC(startDate);
  const endObj = parseMiddayUTC(endDate);
  const dates: string[] = [];
  let truncated = false;

  const cursor = new Date(startObj);
  let totalVisited = 0;

  while (cursor.getTime() <= endObj.getTime()) {
    if (totalVisited >= maxDays) {
      truncated = true;
      break;
    }
    if (allowedSet.has(cursor.getUTCDay())) {
      dates.push(formatISODate(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    totalVisited += 1;
  }

  return { dates, truncated };
}

/**
 * Regroupe les affectations d'un équipier sur d'autres chantiers pour un ensemble de dates.
 */
function collectOtherChantiersConflicts(params: {
  chantierId: string;
  profileId: string;
  datesSet: Set<string>;
  affectations: Affectation[];
  chantiers: Chantier[];
}): OtherChantierConflict[] {
  const { chantierId, profileId, datesSet, affectations, chantiers } = params;
  const chantierNameMap = new Map(chantiers.map((c) => [c.id, c.nom_client]));
  const grouped = new Map<string, Set<string>>();

  for (const aff of affectations) {
    if (
      aff.profile_id === profileId &&
      aff.chantier_id !== chantierId &&
      datesSet.has(aff.date_intervention)
    ) {
      const existing = grouped.get(aff.chantier_id) ?? new Set<string>();
      existing.add(aff.date_intervention);
      grouped.set(aff.chantier_id, existing);
    }
  }

  const result: OtherChantierConflict[] = [];
  for (const [otherId, dateSet] of grouped.entries()) {
    const sortedDates = Array.from(dateSet).sort();
    result.push({
      chantierId: otherId,
      nomClient: chantierNameMap.get(otherId) || 'Autre chantier',
      count: sortedDates.length,
      dates: sortedDates,
    });
  }

  return result.sort((a, b) => b.count - a.count || a.nomClient.localeCompare(b.nomClient));
}

/**
 * Calcule la couverture d'un équipier sur une période et ses affectations concurrentes.
 */
export function computePeriodWorkerStats(params: {
  chantierId: string;
  profileId: string;
  dates: string[];
  affectations: Affectation[];
  chantiers: Chantier[];
}): PeriodWorkerStats {
  const { chantierId, profileId, dates, affectations, chantiers } = params;
  const totalDays = dates.length;
  if (totalDays === 0) {
    return {
      assignedCount: 0,
      totalDays: 0,
      isFullyAssigned: false,
      isPartiallyAssigned: false,
      otherChantiers: [],
    };
  }

  const datesSet = new Set(dates);
  const assignedDateSet = new Set<string>();

  for (const aff of affectations) {
    if (
      aff.chantier_id === chantierId &&
      aff.profile_id === profileId &&
      datesSet.has(aff.date_intervention)
    ) {
      assignedDateSet.add(aff.date_intervention);
    }
  }

  const assignedCount = assignedDateSet.size;
  const otherChantiers = collectOtherChantiersConflicts({
    chantierId,
    profileId,
    datesSet,
    affectations,
    chantiers,
  });

  return {
    assignedCount,
    totalDays,
    isFullyAssigned: assignedCount === totalDays,
    isPartiallyAssigned: assignedCount > 0 && assignedCount < totalDays,
    otherChantiers,
  };
}

/**
 * Calcule les conflits éventuels d'un équipier sur d'autres chantiers pour une date donnée.
 */
export function computeDayWorkerConflicts(params: {
  chantierId: string;
  profileId: string;
  dateStr: string;
  affectations: Affectation[];
  chantiers: Chantier[];
}): OtherChantierConflict[] {
  return collectOtherChantiersConflicts({
    chantierId: params.chantierId,
    profileId: params.profileId,
    datesSet: new Set([params.dateStr]),
    affectations: params.affectations,
    chantiers: params.chantiers,
  });
}

/**
 * Calcule le diff exact (ajouts / retraits) pour appliquer une équipe sur une liste de dates.
 * - En mode 'add' : ajoute les combinaisons manquantes sans doublon et ne retire rien.
 * - En mode 'replace' : ajoute les manquants et retire les affectations du chantier non retenues.
 */
export function computePeriodDiff(params: {
  chantierId: string;
  dates: string[];
  selectedWorkerIds: string[];
  mode: ApplyPeriodMode;
  existingAffectations: Affectation[];
}): PeriodDiffResult {
  const { chantierId, dates, selectedWorkerIds, mode, existingAffectations } = params;
  if (dates.length === 0) {
    return { toAdd: [], toRemoveIds: [] };
  }

  const datesSet = new Set(dates);
  const selectedSet = new Set(selectedWorkerIds);

  const relevantExisting = existingAffectations.filter(
    (a) => a.chantier_id === chantierId && datesSet.has(a.date_intervention)
  );

  const existingKeySet = new Set(
    relevantExisting.map((a) => `${a.date_intervention}::${a.profile_id}`)
  );

  const toAdd: NewAffectationInput[] = [];
  for (const dateStr of dates) {
    for (const profileId of selectedSet) {
      if (!existingKeySet.has(`${dateStr}::${profileId}`)) {
        toAdd.push({
          chantier_id: chantierId,
          profile_id: profileId,
          date_intervention: dateStr,
        });
      }
    }
  }

  const toRemoveIds: string[] = [];
  if (mode === 'replace') {
    for (const aff of relevantExisting) {
      if (!selectedSet.has(aff.profile_id)) {
        toRemoveIds.push(aff.id);
      }
    }
  }

  return { toAdd, toRemoveIds };
}

/**
 * Retourne la date active précédente pour l'action « Copier la veille » :
 * - si `currentDate` se trouve dans `periodDates` à l'index i > 0, retourne `periodDates[i - 1]`
 * - sinon retourne la veille calendaire (J-1).
 */
export function getPreviousActiveDate(currentDate: string, periodDates: string[]): string {
  const idx = periodDates.indexOf(currentDate);
  if (idx > 0) {
    return periodDates[idx - 1];
  }
  const d = parseMiddayUTC(currentDate);
  d.setUTCDate(d.getUTCDate() - 1);
  return formatISODate(d);
}

/**
 * Formate le message de feedback après une opération groupée d'affectations.
 */
export function formatBatchAffectationFeedback(
  addedCount: number,
  removedCount: number
): string {
  if (addedCount === 0 && removedCount === 0) {
    return 'Aucune modification à appliquer';
  }
  if (addedCount > 0 && removedCount > 0) {
    return `Équipe mise à jour (+${addedCount} / -${removedCount})`;
  }
  if (addedCount > 0) {
    return `${addedCount} affectation(s) ajoutée(s)`;
  }
  return `${removedCount} affectation(s) retirée(s)`;
}
