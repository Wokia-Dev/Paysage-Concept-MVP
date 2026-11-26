import { useCallback, useEffect, useState } from 'react';
import { db, reseedDatabase } from '../lib/db';
import { syncEngine } from '../lib/sync';

export interface DbStats {
  pointagesCount: number;
  unsyncedCount: number;
  chantiersCount: number;
  profilesCount: number;
}

export function usePlusDiagnostics(isOnline: boolean) {
  const [dbStats, setDbStats] = useState<DbStats>({
    pointagesCount: 0,
    unsyncedCount: 0,
    chantiersCount: 0,
    profilesCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const [ptCount, unsynced, chCount, prCount] = await Promise.all([
        db.pointages.count(),
        db.pointages.filter((pt) => !pt.synced).count(),
        db.chantiers.count(),
        db.profiles.count(),
      ]);
      setDbStats({
        pointagesCount: ptCount,
        unsyncedCount: unsynced,
        chantiersCount: chCount,
        profilesCount: prCount,
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = () => {
      if (isMounted) void loadStats();
    };

    fetchStats();
    const unsub = syncEngine.subscribe(fetchStats);
    return () => {
      isMounted = false;
      unsub();
    };
  }, [loadStats]);

  const handleSyncNow = async () => {
    if (!isOnline) {
      setMessage('Impossible : vous êtes actuellement hors-ligne.');
      return;
    }

    setIsSyncing(true);
    setMessage(null);
    const res = await syncEngine.triggerSync();
    await loadStats();
    setIsSyncing(false);

    if (res.requiresRealAuth) {
      setMessage(`ℹ️ ${res.lastError}`);
    } else if (res.failed > 0) {
      setMessage(`⚠️ Échec sur ${res.failed} pointage(s) : ${res.lastError}`);
    } else if (res.success > 0) {
      setMessage(`✅ Succès : ${res.success} pointage(s) enregistré(s) dans Supabase !`);
    } else {
      setMessage('Tous les pointages sont déjà synchronisés dans Supabase.');
    }
  };

  const handleResetDemoData = async () => {
    if (confirm('Réinitialiser le cache local et recharger les données fraîches ?')) {
      await reseedDatabase();
      if (isOnline) {
        await syncEngine.pullRemoteChantiers();
      }
      await loadStats();
      setMessage('Cache IndexedDB réinitialisé et synchronisé avec succès.');
    }
  };

  return {
    dbStats,
    isSyncing,
    message,
    handleSyncNow,
    handleResetDemoData,
  };
}
