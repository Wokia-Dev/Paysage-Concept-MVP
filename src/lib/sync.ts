import { db, ensureSeedData } from './db';
import { supabase } from './supabase';
import type { PointageLocal } from '../types/database';

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
  heures_totales: number;
  temps_pause: number;
  heures_sup: number;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
      // Initialise le seed si nécessaire et récupère les données fraîches de Supabase
      ensureSeedData()
        .then(() => {
          if (navigator.onLine) {
            this.pullRemoteData().catch(() => {});
          }
        })
        .catch(console.error);
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

    const pointage: PointageLocal = {
      id: pointageId,
      profile_id: data.profile_id,
      chantier_id: data.chantier_id ?? null,
      date: data.date,
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

      for (const pt of pending) {
        try {
          const payload = {
            id: pt.id,
            profile_id: session.user.id,
            chantier_id: pt.chantier_id || null,
            date: pt.date,
            heures_totales: Number(pt.heures_totales) || 0,
            temps_pause: Number(pt.temps_pause) || 0,
            heures_sup: Number(pt.heures_sup) || 0,
            synchronise_le: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // UPSERT ciblant la contrainte d'unicité (profile_id, date)
          const { data, error } = await supabase
            .from('pointages')
            .upsert(payload, { onConflict: 'profile_id,date' })
            .select('id, synchronise_le, updated_at')
            .single();

          if (!error) {
            const finalId = data?.id || pt.id;
            if (pt.id !== finalId) {
              await db.pointages.delete(pt.id);
            }
            await db.pointages.put({
              ...pt,
              id: finalId,
              synced: true,
              error: null,
              synchronise_le: data?.synchronise_le || payload.synchronise_le,
              updated_at: data?.updated_at || payload.updated_at,
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
   * Récupère TOUTES les données distantes depuis Supabase
   * (chantiers, profils, affectations et pointages) et réconcilie Dexie sans écraser les brouillons locaux.
   */
  public async pullRemoteData(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    try {
      // 1. Chantiers
      const { data: remoteChantiers, error: chantiersErr } = await supabase
        .from('chantiers')
        .select('*');

      if (!chantiersErr && remoteChantiers && remoteChantiers.length > 0) {
        await db.chantiers.bulkPut(remoteChantiers);
      }

      // 2. Profils
      const { data: remoteProfiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*');

      if (!profilesErr && remoteProfiles && remoteProfiles.length > 0) {
        await db.profiles.bulkPut(remoteProfiles);
      }

      // 3. Affectations
      const { data: remoteAffs, error: affsErr } = await supabase
        .from('affectations')
        .select('*');

      if (!affsErr && remoteAffs && remoteAffs.length > 0) {
        await db.affectations.bulkPut(remoteAffs);
      }

      // 4. Pointages déclaratifs distants (triés par date décroissante)
      const { data: remotePointages, error: pointagesErr } = await supabase
        .from('pointages')
        .select('*')
        .order('date', { ascending: false })
        .limit(300);

      if (!pointagesErr && remotePointages && remotePointages.length > 0) {
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
