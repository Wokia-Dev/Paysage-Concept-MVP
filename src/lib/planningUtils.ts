import type { Affectation, Chantier, Profile } from '../types/database';
import { formatISODate, getTodayDateString, getWeekMonday, parseMiddayUTC } from './dates.ts';

export type ViewMode = 'day' | 'week' | 'month';

export interface DayItem {
  dateStr: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  dateObj: Date;
}

export interface MonthGridDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  missionsCount: number;
  hasUserMission: boolean;
}

export interface PlanningMission {
  chantier: Chantier;
  assignedMembers: Profile[];
  isUserAssigned: boolean;
}

/**
 * Génère les 7 jours (Lundi -> Dimanche) de la semaine contenant `weekMonday`.
 */
export function generateWeekDays(weekMonday: Date, todayStr = getTodayDateString(0)): DayItem[] {
  const days: DayItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday);
    d.setUTCDate(weekMonday.getUTCDate() + i);

    const dateStr = formatISODate(d);
    const dayName = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      timeZone: 'UTC',
    })
      .format(d)
      .replace('.', '')
      .toUpperCase();

    days.push({
      dateStr,
      dayNumber: d.getUTCDate(),
      dayName,
      isToday: dateStr === todayStr,
      dateObj: d,
    });
  }
  return days;
}

/**
 * Calcule le libellé relatif d'une semaine par rapport à la semaine courante.
 */
export function getRelativeWeekLabel(
  currentWeekMonday: Date,
  todayStr = getTodayDateString(0)
): string {
  const today = parseMiddayUTC(todayStr);
  const todayMonday = getWeekMonday(today);

  const diffMs = currentWeekMonday.getTime() - todayMonday.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  if (diffWeeks === 0) return 'Cette semaine';
  if (diffWeeks > 0) return `Dans +${diffWeeks} sem.`;
  return `Il y a ${Math.abs(diffWeeks)} sem.`;
}

/**
 * Récupère les chantiers et équipiers affectés à une date donnée, filtrés selon le rôle/filtre.
 */
export function getMissionsForDate(params: {
  dateStr: string;
  affectations: Affectation[];
  chantiers: Chantier[];
  profiles: Profile[];
  currentUserId: string | null;
  targetFilterProfileId: string | null;
}): PlanningMission[] {
  const { dateStr, affectations, chantiers, profiles, currentUserId, targetFilterProfileId } =
    params;

  const dayAffs = affectations.filter((a) => a.date_intervention === dateStr);
  const relevantAffs = targetFilterProfileId
    ? dayAffs.filter((a) => a.profile_id === targetFilterProfileId)
    : dayAffs;

  const chantierIds = Array.from(new Set(relevantAffs.map((a) => a.chantier_id)));

  const missions = chantierIds
    .map((id) => chantiers.find((c) => c.id === id))
    .filter((c): c is Chantier => c !== undefined);

  return missions.map((ch) => {
    const assignedProfileIds = dayAffs
      .filter((a) => a.chantier_id === ch.id)
      .map((a) => a.profile_id);

    const assignedMembers = profiles.filter((p) => assignedProfileIds.includes(p.id));

    return {
      chantier: ch,
      assignedMembers,
      isUserAssigned: currentUserId ? assignedProfileIds.includes(currentUserId) : true,
    };
  });
}

/**
 * Génère la matrice complète (multiple de 7 colonnes, Lun -> Dim) d'un mois donné.
 */
export function generateMonthGridDays(params: {
  currentMonthDate: Date;
  selectedDate: string;
  todayStr?: string;
  getMissions: (dateStr: string) => PlanningMission[];
}): MonthGridDay[] {
  const {
    currentMonthDate,
    selectedDate,
    todayStr = getTodayDateString(0),
    getMissions,
  } = params;

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: MonthGridDay[] = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    const d = String(prevDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const missions = getMissions(dateStr);
    days.push({
      dateStr,
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      missionsCount: missions.length,
      hasUserMission: missions.some((mission) => mission.isUserAssigned),
    });
  }

  for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const missions = getMissions(dStr);
    days.push({
      dateStr: dStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
      isSelected: dStr === selectedDate,
      missionsCount: missions.length,
      hasUserMission: missions.some((mission) => mission.isUserAssigned),
    });
  }

  const remainder = days.length % 7;
  if (remainder > 0) {
    const fillCount = 7 - remainder;
    for (let i = 1; i <= fillCount; i++) {
      const nextDate = new Date(year, month + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const missions = getMissions(dateStr);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        missionsCount: missions.length,
        hasUserMission: missions.some((mission) => mission.isUserAssigned),
      });
    }
  }

  return days;
}
