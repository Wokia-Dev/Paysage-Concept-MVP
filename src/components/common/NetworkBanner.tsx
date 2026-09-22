import { useEffect, useState } from 'react';
import { syncEngine } from '../../lib/sync';
import { db } from '../../lib/db';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const updateCounts = async () => {
    try {
      const count = await db.pointages.filter((pt) => !pt.synced).count();
      setPendingCount(count);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateCounts();
    };
    const handleOffline = () => {
      setIsOnline(false);
      updateCounts();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let isMounted = true;
    db.pointages
      .filter((pt) => !pt.synced)
      .count()
      .then((count) => {
        if (isMounted) setPendingCount(count);
      })
      .catch(() => {});

    const unsub = syncEngine.subscribe(() => {
      const status = syncEngine.getStatus();
      setIsSyncing(status.isSyncing);
      setIsOnline(status.isOnline);
      db.pointages
        .filter((pt) => !pt.synced)
        .count()
        .then((count) => {
          if (isMounted) setPendingCount(count);
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    await syncEngine.triggerSync();
    await updateCounts();
    setIsSyncing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Statut Réseau */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          isOnline
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
            : 'bg-amber-50 text-amber-800 border border-amber-200/60'
        }`}
      >
        {isOnline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Wifi className="w-3 h-3" />
            <span className="text-[11px] hidden xs:inline">En ligne</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <WifiOff className="w-3 h-3" />
            <span className="text-[11px]">Hors-ligne</span>
          </>
        )}
      </div>

      {/* Pointages en attente de synchro */}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs transition-all active:scale-95 ${
            isOnline
              ? 'bg-terracotta/10 text-terracotta border border-terracotta/30 hover:bg-terracotta/20 cursor-pointer'
              : 'bg-sable/70 text-foret/70 border border-sable'
          }`}
          title={isOnline ? 'Cliquer pour synchroniser immédiatement' : 'Pointages stockés localement'}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-terracotta' : ''}`} />
          <span>{pendingCount} en attente</span>
        </button>
      )}
    </div>
  );
}
