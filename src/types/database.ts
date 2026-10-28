export type UserRole = 'admin' | 'chef_equipe' | 'ouvrier';

export type ChantierStatut = 'en_attente' | 'en_cours' | 'termine';

export type ConversationType = 'general' | 'chantier' | 'direction';

export interface Profile {
  id: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
  role: UserRole;
  email?: string;
  created_at?: string;
}

export interface Chantier {
  id: string;
  nom_client: string;
  adresse: string;
  statut: ChantierStatut;
  date_debut?: string | null;
  date_fin?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_client?: string | null;
  telephone_client?: string | null;
  consignes_securite?: string | null;
}

export interface Affectation {
  id: string;
  chantier_id: string;
  profile_id: string;
  date_intervention: string; // Format YYYY-MM-DD
  chantier?: Chantier;
  profile?: Profile;
}

export interface Pointage {
  id: string;
  profile_id: string;
  chantier_id?: string | null;
  date: string; // Format YYYY-MM-DD
  heures_totales: number;
  temps_pause: number;
  heures_sup: number;
  synchronise_le?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PointageLocal {
  id: string;
  profile_id: string;
  chantier_id?: string | null;
  date: string; // Format YYYY-MM-DD
  heures_totales: number;
  temps_pause: number;
  heures_sup: number;
  synchronise_le?: string | null;
  synced: boolean;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
}
