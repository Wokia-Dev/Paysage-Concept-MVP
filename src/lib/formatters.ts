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
 * Retourne le libellé français d'un rôle utilisateur.
 */
export function getRoleLabel(
  role?: UserRole | string,
  variant: 'full' | 'short' | 'admin' = 'full'
): string {
  if (variant === 'short') {
    switch (role) {
      case 'chef_equipe':
        return 'Chef';
      case 'admin':
        return 'Admin';
      default:
        return 'Ouvrier';
    }
  }

  if (variant === 'admin') {
    switch (role) {
      case 'chef_equipe':
        return "Chef d'équipe";
      case 'admin':
        return 'Administrateur / Conducteur';
      default:
        return 'Ouvrier paysagiste';
    }
  }

  switch (role) {
    case 'chef_equipe':
      return "Chef d'équipe";
    case 'admin':
      return 'Administrateur';
    default:
      return 'Ouvrier paysagiste';
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
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'termine':
      return {
        label: 'Terminé',
        className: 'bg-slate-100 text-slate-800 border-slate-200',
      };
    default:
      return {
        label: 'En attente',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
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
