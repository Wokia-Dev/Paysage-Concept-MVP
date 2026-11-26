/**
 * Utilitaires purs de manipulation et formatage de dates sans dérive de fuseau horaire.
 * Toutes les opérations calendaire s'appuient sur un ancrage midi UTC (12:00:00Z).
 */

/**
 * Retourne la date locale courante (ou décalée de `offsetDays` jours) au format YYYY-MM-DD.
 */
export function getTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse une date YYYY-MM-DD en Date ancrée à 12:00:00 UTC pour éviter les décalages DST.
 */
export function parseMiddayUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0));
}

/**
 * Formate une Date UTC en chaîne ISO YYYY-MM-DD.
 */
export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Calcule le numéro de semaine ISO-8601 (1..53) pour une date UTC.
 */
export function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 12));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Retourne le lundi (ancré à midi UTC) de la semaine contenant `d`.
 */
export function getWeekMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getUTCDay(); // 0 = Dimanche, 1 = Lundi...
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy;
}

function capitalizeFirst(str: string): string {
  return str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

/**
 * Formate le mois et l'année en français avec majuscule initiale (ex: "Octobre 2026").
 */
export function formatFrenchMonthYear(d: Date, timeZone: 'UTC' | undefined = 'UTC'): string {
  const label = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
  return capitalizeFirst(label);
}

/**
 * Formate une date en français long (ex: "Mercredi 28 octobre").
 */
export function formatFrenchWeekdayDate(dateStr: string): string {
  try {
    const d = parseMiddayUTC(dateStr);
    const label = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(d);
    return capitalizeFirst(label);
  } catch {
    return dateStr;
  }
}

/**
 * Formate une date en français court avec année (ex: "Mer. 28 oct. 2026").
 */
export function formatFrenchShortDate(dateStr: string): string {
  try {
    const d = parseMiddayUTC(dateStr);
    const label = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
    return capitalizeFirst(label);
  } catch {
    return dateStr;
  }
}
