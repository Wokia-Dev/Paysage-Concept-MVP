import type { PointageLocal, Profile } from '../types/database';

export interface HoursSummary {
  totalHours: number;
  totalPause: number;
  totalOvertime: number;
  normalHours: number; // totalHours - totalOvertime
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface WorkerDailyStatus {
  profile: Profile;
  pointage?: PointageLocal;
  hasSubmitted: boolean;
  heuresTotales: number;
  tempsPause: number;
  heuresSup: number;
  chantierId?: string | null;
}

export interface TeamDailySummary {
  totalTeamHours: number;
  totalNormalHours: number;
  totalOvertime: number;
  totalPause: number;
  workersCount: number;
  submittedCount: number;
  statuses: WorkerDailyStatus[];
}

export const DEFAULT_DAILY_TARGET = 7.0; // 7h00 standard journalier (35h / 5 jours)
export const DEFAULT_PAUSE = 0.5; // 30 min par défaut
export const DAILY_TARGET_STORAGE_PREFIX = 'paysage_daily_target';
export const LAST_TIME_RANGE_STORAGE_PREFIX = 'paysage_last_time_range';

/**
 * Normalise une chaîne horaire (enlève les secondes si format HH:mm:ss, gère les espaces et le format).
 */
export function normalizeTimeString(time?: string | null): string {
  if (!time) return '';
  const trimmed = time.trim();
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    if (/^\d{2}$/.test(hh) && /^\d{2}$/.test(mm)) {
      const hNum = parseInt(hh, 10);
      const mNum = parseInt(mm, 10);
      if (hNum >= 0 && hNum <= 23 && mNum >= 0 && mNum <= 59) {
        return `${hh}:${mm}`;
      }
    }
  }
  return '';
}

/**
 * Convertit une chaîne "HH:mm" en heures décimales (ex: "08:30" -> 8.5).
 */
export function parseTimeToDecimal(timeStr: string): number {
  const normalized = normalizeTimeString(timeStr);
  if (!normalized) return 0;
  const [hh, mm] = normalized.split(':').map((s) => parseInt(s, 10));
  return Math.round((hh + mm / 60) * 100) / 100;
}

/**
 * Convertit un nombre d'heures décimal en chaîne "HH:mm" (ex: 8.5 -> "08:30").
 */
export function decimalToTimeString(decimalHours: number): string {
  if (!Number.isFinite(decimalHours)) return '00:00';
  const clamped = Math.max(0, Math.min(23.999, decimalHours));
  let hrs = Math.floor(clamped);
  let mins = Math.round((clamped - hrs) * 60);
  if (mins >= 60) {
    hrs = (hrs + 1) % 24;
    mins = 0;
  }
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Calcule l'amplitude horaire décimale entre l'heure d'arrivée et l'heure de départ.
 * Retourne 0 si l'une des heures est absente ou si le départ est antérieur/égal à l'arrivée.
 */
export function calculateAmplitude(heureDebut: string, heureFin: string): number {
  const normDebut = normalizeTimeString(heureDebut);
  const normFin = normalizeTimeString(heureFin);
  if (!normDebut || !normFin) return 0;

  const start = parseTimeToDecimal(normDebut);
  const end = parseTimeToDecimal(normFin);
  if (end <= start) return 0;

  return Math.round((end - start) * 100) / 100;
}

/**
 * Calcule la durée travaillée nette (Amplitude - Pause) à partir d'une plage horaire.
 */
export function calculateDurationFromRange(
  heureDebut: string,
  heureFin: string,
  tempsPause: number
): number {
  const amplitude = calculateAmplitude(heureDebut, heureFin);
  const pause = Number.isFinite(tempsPause) ? Math.max(0, tempsPause) : 0;
  return Math.max(0, Math.round((amplitude - pause) * 100) / 100);
}

/**
 * Valide la cohérence d'une saisie par plages horaires.
 */
export function validateTimeRange(
  heureDebut: string,
  heureFin: string,
  tempsPause: number
): ValidationResult {
  const normDebut = normalizeTimeString(heureDebut);
  const normFin = normalizeTimeString(heureFin);

  if (!normDebut) {
    return {
      valid: false,
      error: "Veuillez renseigner l'heure d'arrivée.",
    };
  }

  if (!normFin) {
    return {
      valid: false,
      error: "Veuillez renseigner l'heure de départ.",
    };
  }

  const start = parseTimeToDecimal(normDebut);
  const end = parseTimeToDecimal(normFin);

  if (end <= start) {
    return {
      valid: false,
      error: "L'heure de départ doit être strictement postérieure à l'heure d'arrivée.",
    };
  }

  if (!Number.isFinite(tempsPause) || tempsPause < 0) {
    return {
      valid: false,
      error: 'Le temps de pause ne peut pas être négatif.',
    };
  }

  const amplitude = Math.round((end - start) * 100) / 100;
  if (tempsPause >= amplitude) {
    return {
      valid: false,
      error: "Le temps de pause doit être inférieur à l'amplitude travaillée.",
    };
  }

  const dureeNette = Math.round((amplitude - tempsPause) * 100) / 100;
  if (dureeNette > 24) {
    return {
      valid: false,
      error: 'Le total des heures travaillées ne peut pas dépasser 24h par jour.',
    };
  }

  return { valid: true };
}

/**
 * Ajuste une heure "HH:mm" d'un delta en minutes (+/- 15 min), clampé entre 00:00 et 23:45.
 */
export function adjustTimeString(timeStr: string, deltaMinutes: number): string {
  const norm = normalizeTimeString(timeStr) || '08:00';
  const [hh, mm] = norm.split(':').map((s) => parseInt(s, 10));
  const totalMins = hh * 60 + mm + deltaMinutes;
  const clampedMins = Math.max(0, Math.min(23 * 60 + 59, totalMins));
  const newH = Math.floor(clampedMins / 60);
  const newM = clampedMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Récupère les dernières plages horaires utilisées mémorisées dans localStorage.
 */
export function getLastUsedTimeRange(
  profileId?: string
): { heureDebut: string; heureFin: string } | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const key = profileId
      ? `${LAST_TIME_RANGE_STORAGE_PREFIX}_${profileId}`
      : LAST_TIME_RANGE_STORAGE_PREFIX;
    const stored =
      window.localStorage.getItem(key) ||
      window.localStorage.getItem(LAST_TIME_RANGE_STORAGE_PREFIX);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.heureDebut === 'string' && typeof parsed.heureFin === 'string') {
        const normDebut = normalizeTimeString(parsed.heureDebut);
        const normFin = normalizeTimeString(parsed.heureFin);
        if (normDebut && normFin) {
          return { heureDebut: normDebut, heureFin: normFin };
        }
      }
    }
  } catch (err) {
    console.warn('Impossible de lire les derniers horaires mémorisés', err);
  }
  return null;
}

/**
 * Mémorise les dernières plages horaires utilisées dans localStorage.
 */
export function setLastUsedTimeRange(
  heureDebut: string,
  heureFin: string,
  profileId?: string
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const normDebut = normalizeTimeString(heureDebut);
    const normFin = normalizeTimeString(heureFin);
    if (!normDebut || !normFin) return;

    const key = profileId
      ? `${LAST_TIME_RANGE_STORAGE_PREFIX}_${profileId}`
      : LAST_TIME_RANGE_STORAGE_PREFIX;
    const payload = JSON.stringify({ heureDebut: normDebut, heureFin: normFin });
    window.localStorage.setItem(key, payload);
    window.localStorage.setItem(LAST_TIME_RANGE_STORAGE_PREFIX, payload);
  } catch (err) {
    console.warn('Impossible d\'enregistrer les derniers horaires dans localStorage', err);
  }
}

/**
 * Récupère l'objectif d'heures journalier stocké pour l'utilisateur (ou valeur par défaut 7h).
 */
export function getStoredDailyTarget(profileId?: string): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_DAILY_TARGET;
  }
  try {
    const key = profileId
      ? `${DAILY_TARGET_STORAGE_PREFIX}_${profileId}`
      : DAILY_TARGET_STORAGE_PREFIX;
    const stored =
      window.localStorage.getItem(key) ||
      window.localStorage.getItem(DAILY_TARGET_STORAGE_PREFIX);
    if (stored) {
      const parsed = parseFloat(stored);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 24) {
        return Math.round(parsed * 100) / 100;
      }
    }
  } catch (err) {
    console.warn('Impossible de lire l\'objectif d\'heures dans localStorage', err);
  }
  return DEFAULT_DAILY_TARGET;
}

/**
 * Enregistre l'objectif d'heures journalier dans le stockage local.
 */
export function setStoredDailyTarget(target: number, profileId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const clamped = Math.max(1, Math.min(24, Math.round(target * 100) / 100));
    const key = profileId
      ? `${DAILY_TARGET_STORAGE_PREFIX}_${profileId}`
      : DAILY_TARGET_STORAGE_PREFIX;
    window.localStorage.setItem(key, String(clamped));
    window.localStorage.setItem(DAILY_TARGET_STORAGE_PREFIX, String(clamped));
  } catch (err) {
    console.warn('Impossible de sauvegarder l\'objectif d\'heures dans localStorage', err);
  }
}

/**
 * Pré-calcule intelligemment les heures supplémentaires en fonction des heures totales
 * et de l'objectif journalier configuré : Math.max(0, heures_totales - daily_target).
 */
export function calculateAutoOvertime(heuresTotales: number, dailyTarget: number): number {
  if (!Number.isFinite(heuresTotales) || !Number.isFinite(dailyTarget)) {
    return 0;
  }
  const total = Math.max(0, heuresTotales);
  const target = Math.max(0, dailyTarget);
  return Math.max(0, Math.round((total - target) * 100) / 100);
}

/**
 * Calcule les heures normales travaillées (heures totales - heures sup incluses).
 * Garantit que le résultat est toujours >= 0 et <= heuresTotales.
 */
export function calculateNormalHours(heuresTotales: number, heuresSup: number): number {
  if (!Number.isFinite(heuresTotales)) return 0;
  const safeTotal = Math.max(0, heuresTotales);
  const safeSup = Number.isFinite(heuresSup) ? Math.max(0, heuresSup) : 0;
  return Math.max(0, Math.round((safeTotal - Math.min(safeTotal, safeSup)) * 100) / 100);
}

/**
 * Formate un nombre d'heures décimal en chaîne lisible (ex: 7.5 -> "7h30", 8 -> "8h00").
 */
export function formatHours(decimalHours: number): string {
  if (!Number.isFinite(decimalHours)) {
    return '0h00';
  }

  const isNegative = decimalHours < 0;
  const absHours = Math.abs(decimalHours);
  const hrs = Math.floor(absHours);
  const mins = Math.round((absHours - hrs) * 60);

  // Correction si l'arrondi des minutes atteint 60
  if (mins >= 60) {
    const adjustedHrs = hrs + 1;
    return `${isNegative ? '-' : ''}${adjustedHrs}h00`;
  }

  return `${isNegative ? '-' : ''}${hrs}h${String(mins).padStart(2, '0')}`;
}

/**
 * Valide les saisies d'heures journalières selon les règles métier.
 * - Doit être un nombre fini.
 * - Ne peut être négatif.
 * - Heures totales, pause et sup ne peuvent excéder 24h.
 * - Les heures sup doivent être <= aux heures totales.
 */
export function validateDailyHours(
  total: number,
  pause: number,
  sup: number
): ValidationResult {
  if (!Number.isFinite(total) || !Number.isFinite(pause) || !Number.isFinite(sup)) {
    return {
      valid: false,
      error: 'Toutes les valeurs doivent être des nombres valides.',
    };
  }

  if (total < 0 || pause < 0 || sup < 0) {
    return {
      valid: false,
      error: 'Les heures ne peuvent pas être négatives.',
    };
  }

  if (total > 24) {
    return {
      valid: false,
      error: 'Le total des heures travaillées ne peut pas dépasser 24h par jour.',
    };
  }

  if (pause > 24) {
    return {
      valid: false,
      error: 'Le temps de pause ne peut pas dépasser 24h.',
    };
  }

  if (sup > 24) {
    return {
      valid: false,
      error: 'Les heures supplémentaires ne peuvent pas dépasser 24h.',
    };
  }

  if (sup > total) {
    return {
      valid: false,
      error: 'Les heures supplémentaires ne peuvent pas dépasser les heures totales travaillées.',
    };
  }

  return { valid: true };
}

/**
 * Calcule le temps de travail net en retranchant la pause si applicable.
 */
export function calculateNetWorkedHours(total: number, pause: number): number {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safePause = Number.isFinite(pause) ? Math.max(0, pause) : 0;
  return Math.max(0, safeTotal - safePause);
}

/**
 * Calcule la synthèse cumulative d'une liste de déclarations d'heures.
 */
export function calculateHoursSummary(pointages: PointageLocal[]): HoursSummary {
  return pointages.reduce(
    (acc, p) => {
      const tot = Number(p.heures_totales) || 0;
      const pause = Number(p.temps_pause) || 0;
      const sup = Number(p.heures_sup) || 0;

      acc.totalHours += tot;
      acc.totalPause += pause;
      acc.totalOvertime += sup;
      acc.normalHours += Math.max(0, tot - sup);

      return acc;
    },
    { totalHours: 0, totalPause: 0, totalOvertime: 0, normalHours: 0 }
  );
}

/**
 * Agrège les statuts journaliers de toute une équipe pour une date cible.
 */
export function aggregateTeamDailyStatus(
  pointages: PointageLocal[],
  profiles: Profile[],
  targetDate: string
): TeamDailySummary {
  let totalTeamHours = 0;
  let totalNormalHours = 0;
  let totalOvertime = 0;
  let totalPause = 0;
  let submittedCount = 0;

  const statuses: WorkerDailyStatus[] = profiles.map((worker) => {
    const pt = pointages.find(
      (p) => p.profile_id === worker.id && p.date === targetDate
    );

    const hasSubmitted = Boolean(pt && Number(pt.heures_totales) > 0);
    const heuresTotales = pt ? Number(pt.heures_totales) || 0 : 0;
    const tempsPause = pt ? Number(pt.temps_pause) || 0 : 0;
    const heuresSup = pt ? Number(pt.heures_sup) || 0 : 0;

    if (hasSubmitted) {
      submittedCount++;
    }

    totalTeamHours += heuresTotales;
    totalNormalHours += Math.max(0, heuresTotales - heuresSup);
    totalOvertime += heuresSup;
    totalPause += tempsPause;

    return {
      profile: worker,
      pointage: pt,
      hasSubmitted,
      heuresTotales,
      tempsPause,
      heuresSup,
      chantierId: pt?.chantier_id ?? null,
    };
  });

  return {
    totalTeamHours,
    totalNormalHours,
    totalOvertime,
    totalPause,
    workersCount: profiles.length,
    submittedCount,
    statuses,
  };
}
