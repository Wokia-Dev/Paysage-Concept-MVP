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

class SyncEngine {
  private isSyncing = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.triggerSync();
      });
      // Initialise le seed si nécessaire
      ensureSeedData().catch(console.error);
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
   * Enregistre un pointage dans Dexie immédiatement (zéro latence)
   * et déclenche la synchro réseau en arrière-plan.
   */
  public async addPointage(
    data: Omit<PointageLocal, 'id' | 'synced'>
  ): Promise<PointageLocal> {
    const localId = `pt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pointage: PointageLocal = {
      ...data,
      id: localId,
      synced: false,
    };

    await db.pointages.put(pointage);
    this.notify();

    // Tente immédiatement une synchronisation silencieuse si en ligne
    if (navigator.onLine) {
      this.triggerSync().catch(() => {});
    }

    return pointage;
  }

  /**
   * Synchronise les pointages en attente vers Supabase
   */
  public async syncPendingPointages(): Promise<SyncResult> {
    if (this.isSyncing) return { success: 0, failed: 0, totalPending: 0 };
    if (!navigator.onLine) {
      return { success: 0, failed: 0, totalPending: 0, lastError: 'Vous êtes hors-ligne' };
    }

    this.isSyncing = true;
    this.notify();

    let successCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;
    let requiresRealAuth = false;

    try {
      // Récupération de TOUS les pointages locaux non synchronisés (false ou undefined)
      const pending = await db.pointages.filter((pt) => !pt.synced).toArray();

      if (pending.length === 0) {
        return { success: 0, failed: 0, totalPending: 0 };
      }

      // Vérifier si une session Supabase active existe
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // L'utilisateur est en mode compte démo local sans token Supabase
        requiresRealAuth = true;
        lastError = 'Session Supabase requise : vous utilisez un compte démo local. Connectez-vous avec un vrai compte Supabase pour synchroniser.';
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
            profile_id: session.user.id, // Toujours utiliser l'UID Supabase authentifié
            chantier_id: pt.chantier_id,
            type: pt.type,
            horodatage: pt.horodatage,
            latitude: pt.latitude ?? null,
            longitude: pt.longitude ?? null,
            synchronise_le: new Date().toISOString(),
          };

          const { error } = await supabase.from('pointages').insert(payload);

          if (!error) {
            await db.pointages.update(pt.id, {
              synced: true,
              error: null,
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

      // Tente également de rafraîchir les données distantes (chantiers, affectations)
      await this.pullRemoteChantiers();
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
   * Tente de récupérer les chantiers et affectations depuis Supabase
   * sans écraser les données locales en cas de panne réseau.
   */
  public async pullRemoteChantiers(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const { data: remoteChantiers, error: chantiersErr } = await supabase
        .from('chantiers')
        .select('*');

      if (!chantiersErr && remoteChantiers && remoteChantiers.length > 0) {
        await db.chantiers.bulkPut(remoteChantiers);
      }

      const { data: remoteProfiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*');

      if (!profilesErr && remoteProfiles && remoteProfiles.length > 0) {
        await db.profiles.bulkPut(remoteProfiles);
      }

      const { data: remoteAffs, error: affsErr } = await supabase
        .from('affectations')
        .select('*');

      if (!affsErr && remoteAffs && remoteAffs.length > 0) {
        await db.affectations.bulkPut(remoteAffs);
      }
    } catch {
      // Échec silencieux
    }
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
