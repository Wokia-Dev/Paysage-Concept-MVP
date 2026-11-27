import type { Table } from 'dexie';
import { db } from './db.ts';
import { supabase } from './supabase.ts';
import type { PointageLocal } from '../types/database';
import { normalizeTimeString } from './hours.ts';
import { generateUUID } from './formatters.ts';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncResult {
  success: number;
  failed: number;
  totalPending: number;
  lastError?: string | null;
  requiresRealAuth?: boolean;
}

export interface SaveDailyPointageInput {
  profile_id: string;
  chantier_id?: string | null;
  date: string; // Format YYYY-MM-DD
  heure_debut?: string | null;
  heure_fin?: string | null;
  heures_totales: number;
  temps_pause: number;
  heures_sup: number;
}

interface PointageUpsertPayload {
  id: string;
  profile_id: string;
  chantier_id: string | null;
  date: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
  heures_totales: number;
  temps_pause: number;
  heures_sup: number;
  synchronise_le: string;
  updated_at: string;
}

class SyncEngine {
  private isSyncing = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.triggerSync().catch(() => {});
        this.pullRemoteData().catch(() => {});
      });
      // Récupère les données fraîches de Supabase si en ligne (sans injecter de données démo)
      if (navigator.onLine) {
        this.pullRemoteData().catch(() => {});
      }
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  /**
   * Enregistre ou met à jour la déclaration d'heures journalière dans Dexie.
   * Utilise l'index composé [profile_id+date] pour éviter tout doublon local.
   * Conserve l'ID existant lors d'une mise à jour pour garantir l'idempotence.
   */
  public async saveDailyPointage(data: SaveDailyPointageInput): Promise<PointageLocal> {
    const existing = await db.pointages
      .where('[profile_id+date]')
      .equals([data.profile_id, data.date])
      .first();

    const now = new Date().toISOString();
    const pointageId = existing ? existing.id : generateUUID();
    const heureDebut = data.heure_debut ? normalizeTimeString(data.heure_debut) : null;
    const heureFin = data.heure_fin ? normalizeTimeString(data.heure_fin) : null;

    const pointage: PointageLocal = {
      id: pointageId,
      profile_id: data.profile_id,
      chantier_id: data.chantier_id ?? null,
      date: data.date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      heures_totales: Number(data.heures_totales) || 0,
      temps_pause: Number(data.temps_pause) || 0,
      heures_sup: Number(data.heures_sup) || 0,
      synchronise_le: existing?.synchronise_le ?? null,
      synced: false,
      error: null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    await db.pointages.put(pointage);
    this.notify();

    // Déclenchement automatique de la synchronisation si en ligne
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync().catch(() => {});
    }

    return pointage;
  }

  /**
   * Synchronise les pointages en attente vers Supabase via UPSERT sur (profile_id, date)
   */
  public async syncPendingPointages(): Promise<SyncResult> {
    if (this.isSyncing) return { success: 0, failed: 0, totalPending: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: 0, failed: 0, totalPending: 0, lastError: 'Vous êtes hors-ligne' };
    }

    this.isSyncing = true;
    this.notify();

    let successCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;
    let requiresRealAuth = false;

    try {
      // Rafraîchir les données distantes au préalable
      await this.pullRemoteData();

      // Récupération de tous les pointages locaux non synchronisés
      const pending = await db.pointages.filter((pt) => !pt.synced).toArray();

      if (pending.length === 0) {
        return { success: 0, failed: 0, totalPending: 0 };
      }

      // Vérifier si une session Supabase active existe
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        requiresRealAuth = true;
        lastError = 'Session Supabase requise : vous utilisez un compte démo local. Connectez-vous avec un vrai compte Supabase pour synchroniser vos pointages.';
        return {
          success: 0,
          failed: pending.length,
          totalPending: pending.length,
          lastError,
          requiresRealAuth: true,
        };
      }

      const currentProfile = await db.profiles.get(session.user.id);
      const isSupervisor =
        currentProfile?.role === 'chef_equipe' || currentProfile?.role === 'admin';

      for (const pt of pending) {
        const targetProfileId = pt.profile_id || session.user.id;
        // Respect RLS : un ouvrier ne peut synchroniser que ses propres pointages
        if (!isSupervisor && targetProfileId !== session.user.id) {
          continue;
        }

        try {
          const nowIso = new Date().toISOString();
          const payload: PointageUpsertPayload = {
            id: pt.id,
            profile_id: targetProfileId,
            chantier_id: pt.chantier_id || null,
            date: pt.date,
            heure_debut: pt.heure_debut ? normalizeTimeString(pt.heure_debut) : null,
            heure_fin: pt.heure_fin ? normalizeTimeString(pt.heure_fin) : null,
            heures_totales: Number(pt.heures_totales) || 0,
            temps_pause: Number(pt.temps_pause) || 0,
            heures_sup: Number(pt.heures_sup) || 0,
            synchronise_le: nowIso,
            updated_at: nowIso,
          };

          // UPSERT ciblant la contrainte d'unicité (profile_id, date)
          let { data, error } = await supabase
            .from('pointages')
            .upsert(payload, { onConflict: 'profile_id,date' })
            .select('id, synchronise_le, updated_at')
            .single();

          // Fallback gracieux si Supabase n'a pas encore exécuté la migration pour heure_debut/heure_fin
          if (error && (error.message.includes('heure_debut') || error.message.includes('heure_fin'))) {
            delete payload.heure_debut;
            delete payload.heure_fin;
            const retry = await supabase
              .from('pointages')
              .upsert(payload, { onConflict: 'profile_id,date' })
              .select('id, synchronise_le, updated_at')
              .single();
            data = retry.data;
            error = retry.error;
          }

          if (!error) {
            const finalId = typeof data?.id === 'string' ? data.id : pt.id;
            if (pt.id !== finalId) {
              await db.pointages.delete(pt.id);
            }
            await db.pointages.put({
              ...pt,
              id: finalId,
              synced: true,
              error: null,
              synchronise_le:
                typeof data?.synchronise_le === 'string'
                  ? data.synchronise_le
                  : payload.synchronise_le,
              updated_at:
                typeof data?.updated_at === 'string' ? data.updated_at : payload.updated_at,
            });
            successCount++;
          } else {
            lastError = error.message;
            await db.pointages.update(pt.id, {
              error: error.message,
            });
            failedCount++;
          }
        } catch (err: unknown) {
          failedCount++;
          lastError = err instanceof Error ? err.message : 'Erreur réseau';
        }
      }

      // Re-télécharge les données pour refléter les pointages certifiés par le serveur
      await this.pullRemoteData();
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Erreur globale';
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return {
      success: successCount,
      failed: failedCount,
      totalPending: successCount + failedCount,
      lastError,
      requiresRealAuth,
    };
  }

  /**
   * Réconcilie une table locale Dexie avec l'état autoritaire reçu de Supabase,
   * en supprimant les enregistrements locaux qui n'existent plus sur le serveur.
   */
  private async reconcileTable<T extends { id: string }>(
    table: Table<T, string>,
    remoteRows: T[],
    preserveIds?: Set<string>
  ): Promise<void> {
    const remoteIdSet = new Set(remoteRows.map((row) => row.id));
    const localKeys = await table.toCollection().primaryKeys();
    const staleIds = localKeys.filter(
      (id) => !remoteIdSet.has(id) && (!preserveIds || !preserveIds.has(id))
    );
    if (staleIds.length > 0) {
      await table.bulkDelete(staleIds);
    }
    if (remoteRows.length > 0) {
      await table.bulkPut(remoteRows);
    }
  }

  /**
   * Récupère TOUTES les données distantes depuis Supabase
   * (chantiers, profils, affectations et pointages) et réconcilie Dexie sans écraser les brouillons locaux.
   */
  public async pullRemoteData(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // En mode démo locale ou sans session Supabase authentifiée, ne pas écraser les données locales
      if (!session?.user) return;

      // 1. Chantiers
      const { data: remoteChantiers, error: chantiersErr } = await supabase
        .from('chantiers')
        .select('*');

      if (!chantiersErr && Array.isArray(remoteChantiers)) {
        await this.reconcileTable(db.chantiers, remoteChantiers);
      }

      // 2. Profils
      const { data: remoteProfiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*');

      if (!profilesErr && Array.isArray(remoteProfiles)) {
        await this.reconcileTable(db.profiles, remoteProfiles, new Set([session.user.id]));
      }

      // 3. Affectations
      const { data: remoteAffs, error: affsErr } = await supabase
        .from('affectations')
        .select('*');

      if (!affsErr && Array.isArray(remoteAffs)) {
        await this.reconcileTable(db.affectations, remoteAffs);
      }

      // 4. Pointages déclaratifs distants (triés par date décroissante)
      const { data: remotePointages, error: pointagesErr } = await supabase
        .from('pointages')
        .select('*')
        .order('date', { ascending: false })
        .limit(300);

      if (!pointagesErr && Array.isArray(remotePointages)) {
        if (remotePointages.length < 300) {
          const remotePtIds = new Set(remotePointages.map((rp) => rp.id));
          const syncedLocalIds = (await db.pointages.toArray())
            .filter((pt) => pt.synced && !remotePtIds.has(pt.id))
            .map((pt) => pt.id);
          if (syncedLocalIds.length > 0) {
            await db.pointages.bulkDelete(syncedLocalIds);
          }
        }

        for (const rp of remotePointages) {
          const local = await db.pointages
            .where('[profile_id+date]')
            .equals([rp.profile_id, rp.date])
            .first();

          if (local) {
            if (!local.synced) {
              // Saisie locale en attente : NE PAS écraser les modifications locales non synchronisées
              if (local.id !== rp.id) {
                await db.pointages.delete(local.id);
                await db.pointages.put({ ...local, id: rp.id });
              }
            } else {
              // Saisie locale déjà synchronisée : mettre à jour avec les valeurs distantes certifiées
              if (local.id !== rp.id) {
                await db.pointages.delete(local.id);
              }
              await db.pointages.put({
                id: rp.id,
                profile_id: rp.profile_id,
                chantier_id: rp.chantier_id,
                date: rp.date,
                heure_debut: rp.heure_debut ? normalizeTimeString(rp.heure_debut) : null,
                heure_fin: rp.heure_fin ? normalizeTimeString(rp.heure_fin) : null,
                heures_totales: Number(rp.heures_totales) || 0,
                temps_pause: Number(rp.temps_pause) || 0,
                heures_sup: Number(rp.heures_sup) || 0,
                synchronise_le: rp.synchronise_le,
                synced: true,
                error: null,
                created_at: rp.created_at,
                updated_at: rp.updated_at,
              });
            }
          } else {
            // Aucun enregistrement local : insertion directe
            await db.pointages.put({
              id: rp.id,
              profile_id: rp.profile_id,
              chantier_id: rp.chantier_id,
              date: rp.date,
              heure_debut: rp.heure_debut ? normalizeTimeString(rp.heure_debut) : null,
              heure_fin: rp.heure_fin ? normalizeTimeString(rp.heure_fin) : null,
              heures_totales: Number(rp.heures_totales) || 0,
              temps_pause: Number(rp.temps_pause) || 0,
              heures_sup: Number(rp.heures_sup) || 0,
              synchronise_le: rp.synchronise_le,
              synced: true,
              error: null,
              created_at: rp.created_at,
              updated_at: rp.updated_at,
            });
          }
        }
      }

      this.notify();
    } catch (err) {
      console.warn('Erreur lors de la récupération distante Supabase:', err);
    }
  }

  // Alias pour rétro-compatibilité
  public async pullRemoteChantiers(): Promise<void> {
    return this.pullRemoteData();
  }

  public async triggerSync() {
    return this.syncPendingPointages();
  }

  public getStatus() {
    return {
      isSyncing: this.isSyncing,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }
}

export const syncEngine = new SyncEngine();
