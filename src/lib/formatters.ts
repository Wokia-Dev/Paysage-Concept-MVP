import type { ChantierStatut, UserRole } from '../types/database';

/**
 * Génère un UUID v4 compatible navigateur et Node.js.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Indique si un rôle dispose des privilèges de supervision (chef d'équipe ou admin interne).
 * Les ouvriers, apprentis et stagiaires sont tous des profils terrain non superviseurs.
 */
export function isSupervisorRole(role?: UserRole | string | null): boolean {
  return role === 'chef_equipe' || role === 'admin';
}

/**
 * Retourne le libellé français d'un rôle utilisateur.
 * N'affiche jamais « Admin », « Administrateur » ou « Direction » dans l'interface.
 */
export function getRoleLabel(
  role?: UserRole | string,
  variant: 'full' | 'short' = 'full'
): string {
  if (variant === 'short') {
    switch (role) {
      case 'chef_equipe':
      case 'admin':
        return 'Chef';
      case 'apprenti':
        return 'Apprenti';
      case 'stagiaire':
        return 'Stagiaire';
      default:
        return 'Ouvrier';
    }
  }

  switch (role) {
    case 'chef_equipe':
    case 'admin':
      return "Chef d'équipe";
    case 'apprenti':
      return 'Apprenti';
    case 'stagiaire':
      return 'Stagiaire';
    default:
      return 'Ouvrier paysagiste';
  }
}

/**
 * Retourne les libellés et classes Tailwind WCAG AA (clair + sombre) du badge de rôle.
 */
export function getRoleBadgeConfig(role?: UserRole | string): {
  label: string;
  shortLabel: string;
  className: string;
} {
  switch (role) {
    case 'chef_equipe':
    case 'admin':
      return {
        label: "Chef d'équipe",
        shortLabel: 'Chef',
        className:
          'bg-amber-100/90 text-amber-950 border-amber-300 dark:bg-amber-950/75 dark:text-amber-300 dark:border-amber-700/60',
      };
    case 'apprenti':
      return {
        label: 'Apprenti',
        shortLabel: 'Apprenti',
        className:
          'bg-sky-100/90 text-sky-950 border-sky-300 dark:bg-sky-950/75 dark:text-sky-300 dark:border-sky-700/60',
      };
    case 'stagiaire':
      return {
        label: 'Stagiaire',
        shortLabel: 'Stagiaire',
        className:
          'bg-violet-100/90 text-violet-950 border-violet-300 dark:bg-violet-950/75 dark:text-violet-300 dark:border-violet-700/60',
      };
    default:
      return {
        label: 'Ouvrier paysagiste',
        shortLabel: 'Ouvrier',
        className:
          'bg-emerald-100/90 text-emerald-950 border-emerald-300 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border-emerald-700/60',
      };
  }
}

/**
 * Retourne les initiales d'un utilisateur (ou 'PC' par défaut).
 */
export function getInitials(prenom?: string, nom?: string, fallback = 'PC'): string {
  if (!prenom && !nom) return fallback;
  const p = prenom ? prenom.charAt(0) : '';
  const n = nom ? nom.charAt(0) : '';
  const res = `${p}${n}`.toUpperCase();
  return res || fallback;
}

/**
 * Retourne le libellé et les classes Tailwind du badge de statut d'un chantier.
 */
export function getStatusBadge(statut?: ChantierStatut | string): {
  label: string;
  className: string;
} {
  switch (statut) {
    case 'en_cours':
      return {
        label: 'En cours',
        className:
          'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60',
      };
    case 'termine':
      return {
        label: 'Terminé',
        className:
          'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
      };
    default:
      return {
        label: 'En attente',
        className:
          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/60',
      };
  }
}

/**
 * Génère l'URL Google Maps pour une adresse donnée.
 */
export function getMapsUrl(adresse: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(adresse)}`;
}

/**
 * Nettoie un numéro de téléphone pour les liens tel: et sms:.
 */
export function sanitizePhoneHref(telephone: string): string {
  return telephone.replace(/\s+/g, '');
}
