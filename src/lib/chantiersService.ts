import { db } from './db.ts';
import { supabase } from './supabase.ts';
import { generateUUID } from './formatters.ts';
import type { Affectation, Chantier, ChantierStatut } from '../types/database';

export interface ChantierFormInput {
  nom_client: string;
  adresse: string;
  statut: ChantierStatut;
  date_debut?: string;
  date_fin?: string;
  description?: string;
}

export interface MutationResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

type MutationMode =
  | { kind: 'demo' }
  | { kind: 'online_jwt' }
  | { kind: 'blocked'; error: string };

async function resolveMutationMode(): Promise<MutationMode> {
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const isDemo =
    typeof localStorage !== 'undefined' && localStorage.getItem('paysage_is_demo') === 'true';
  const hasStoredProfile =
    typeof localStorage !== 'undefined' &&
    Boolean(localStorage.getItem('paysage_active_profile_id'));

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    if (!isOnline) {
      return {
        kind: 'blocked',
        error:
          'Connexion réseau requise pour modifier les chantiers ou affectations en session Supabase.',
      };
    }
    return { kind: 'online_jwt' };
  }

  if (!isDemo && hasStoredProfile) {
    return {
      kind: 'blocked',
      error: isOnline
        ? 'Session Supabase expirée ou absente. Veuillez vous reconnecter.'
        : 'Connexion réseau requise pour modifier les chantiers ou affectations en session Supabase.',
    };
  }

  return { kind: 'demo' };
}

/**
 * Crée un nouveau chantier dans Dexie et le synchronise avec Supabase si une session JWT est active.
 */
export async function createChantier(
  input: ChantierFormInput
): Promise<MutationResult<Chantier>> {
  const newChantier: Chantier = {
    id: generateUUID(),
    nom_client: input.nom_client.trim(),
    adresse: input.adresse.trim(),
    statut: input.statut,
    date_debut: input.date_debut || undefined,
    date_fin: input.date_fin || undefined,
    description: input.description?.trim() || undefined,
  };

  try {
    const mode = await resolveMutationMode();
    if (mode.kind === 'blocked') {
      return { ok: false, error: mode.error };
    }

    if (mode.kind === 'online_jwt') {
      const { error } = await supabase.from('chantiers').insert({
        id: newChantier.id,
        nom_client: newChantier.nom_client,
        adresse: newChantier.adresse,
        statut: newChantier.statut,
        date_debut: newChantier.date_debut || null,
        date_fin: newChantier.date_fin || null,
        description: newChantier.description || null,
      });

      if (error) {
        return { ok: false, error: `Erreur Supabase : ${error.message}` };
      }
    }

    await db.chantiers.put(newChantier);
    return { ok: true, data: newChantier };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur lors de la création du chantier',
    };
  }
}

/**
 * Met à jour un chantier existant dans Dexie et Supabase.
 */
export async function updateChantier(
  chantierId: string,
  input: ChantierFormInput
): Promise<MutationResult> {
  const updatedData: Partial<Chantier> = {
    nom_client: input.nom_client.trim(),
    adresse: input.adresse.trim(),
    statut: input.statut,
    date_debut: input.date_debut || undefined,
    date_fin: input.date_fin || undefined,
    description: input.description?.trim() || undefined,
  };

  try {
    const mode = await resolveMutationMode();
    if (mode.kind === 'blocked') {
      return { ok: false, error: mode.error };
    }

    if (mode.kind === 'online_jwt') {
      const { error } = await supabase
        .from('chantiers')
        .update({
          nom_client: updatedData.nom_client,
          adresse: updatedData.adresse,
          statut: updatedData.statut,
          date_debut: updatedData.date_debut || null,
          date_fin: updatedData.date_fin || null,
          description: updatedData.description || null,
        })
        .eq('id', chantierId);

      if (error) {
        return { ok: false, error: `Erreur Supabase : ${error.message}` };
      }
    }

    await db.chantiers.update(chantierId, updatedData);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour du chantier',
    };
  }
}

/**
 * Met à jour uniquement le statut d'un chantier dans Dexie et Supabase.
 */
export async function updateChantierStatut(
  chantierId: string,
  statut: ChantierStatut
): Promise<MutationResult> {
  try {
    const mode = await resolveMutationMode();
    if (mode.kind === 'blocked') {
      return { ok: false, error: mode.error };
    }

    if (mode.kind === 'online_jwt') {
      const { error } = await supabase
        .from('chantiers')
        .update({ statut })
        .eq('id', chantierId);

      if (error) {
        return { ok: false, error: `Erreur Supabase : ${error.message}` };
      }
    }

    await db.chantiers.update(chantierId, { statut });
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur lors du changement de statut',
    };
  }
}

/**
 * Ajoute ou retire l'affectation d'un équipier sur un chantier pour une date donnée.
 */
export async function toggleWorkerAffectation(params: {
  chantierId: string;
  profileId: string;
  dateIntervention: string;
  existingAff?: Affectation;
}): Promise<MutationResult<{ action: 'added' | 'removed'; affectation?: Affectation }>> {
  const { chantierId, profileId, dateIntervention, existingAff } = params;

  try {
    const mode = await resolveMutationMode();
    if (mode.kind === 'blocked') {
      return { ok: false, error: mode.error };
    }

    if (existingAff) {
      if (mode.kind === 'online_jwt') {
        const { error } = await supabase.from('affectations').delete().eq('id', existingAff.id);
        if (error) {
          return { ok: false, error: `Erreur Supabase : ${error.message}` };
        }
      }
      await db.affectations.delete(existingAff.id);
      return { ok: true, data: { action: 'removed' } };
    }

    const newAff: Affectation = {
      id: generateUUID(),
      chantier_id: chantierId,
      profile_id: profileId,
      date_intervention: dateIntervention,
    };

    if (mode.kind === 'online_jwt') {
      const { error } = await supabase.from('affectations').insert({
        id: newAff.id,
        chantier_id: newAff.chantier_id,
        profile_id: newAff.profile_id,
        date_intervention: newAff.date_intervention,
      });

      if (error) {
        return { ok: false, error: `Erreur Supabase : ${error.message}` };
      }
    }

    await db.affectations.put(newAff);
    return { ok: true, data: { action: 'added', affectation: newAff } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur lors de la modification de l'affectation",
    };
  }
}
