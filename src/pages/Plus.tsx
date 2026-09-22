import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { db, reseedDatabase } from '../lib/db';
import { syncEngine } from '../lib/sync';
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Trash2,
  Smartphone,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Plus() {
  const { profile, logout, isOnline, isDemo } = useAuth();
  const navigate = useNavigate();

  const [dbStats, setDbStats] = useState({
    pointagesCount: 0,
    unsyncedCount: 0,
    chantiersCount: 0,
    profilesCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStats = async () => {
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
  };

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const [ptCount, unsynced, chCount, prCount] = await Promise.all([
          db.pointages.count(),
          db.pointages.filter((pt) => !pt.synced).count(),
          db.chantiers.count(),
          db.profiles.count(),
        ]);
        if (isMounted) {
          setDbStats({
            pointagesCount: ptCount,
            unsyncedCount: unsynced,
            chantiersCount: chCount,
            profilesCount: prCount,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchStats();
    const unsub = syncEngine.subscribe(fetchStats);
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

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

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-extrabold text-foret">Plus d'options</h1>
        <p className="text-xs text-sauge">Profil, cache local et gestion PWA</p>
      </div>

      {/* Profil de l'utilisateur */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-foret text-sable font-extrabold text-base flex items-center justify-center shadow-xs">
            {profile?.prenom?.charAt(0) || 'U'}
            {profile?.nom?.charAt(0) || ''}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-foret leading-snug">
                {profile?.prenom} {profile?.nom}
              </h2>
              {isDemo ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Démo Locale
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Compte Supabase
                </span>
              )}
            </div>
            <p className="text-xs text-sauge capitalize font-medium flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {profile?.role === 'chef_equipe'
                ? "Chef d'équipe"
                : profile?.role === 'admin'
                  ? 'Administrateur / Conducteur'
                  : 'Ouvrier paysagiste'}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-sable/50 space-y-1 text-xs text-foret/70">
          {profile?.telephone && (
            <p>
              <span className="font-semibold text-foret">Téléphone : </span>
              {profile.telephone}
            </p>
          )}
          {profile?.email && (
            <p>
              <span className="font-semibold text-foret">Email : </span>
              {profile.email}
            </p>
          )}
        </div>

        {isDemo && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 text-xs text-amber-900 rounded-xl leading-relaxed">
            <strong className="block font-bold mb-0.5">Mode Démo Local actif :</strong>
            Les données sont stockées dans le cache IndexedDB du navigateur. Pour envoyer les pointages vers votre vraie base Supabase PostgreSQL, connectez-vous avec un compte Supabase réel depuis l'écran de connexion.
          </div>
        )}
      </div>

      {/* Message d'action feedback */}
      {message && (
        <div
          className={`p-3 border text-xs rounded-xl flex items-start gap-2 leading-relaxed ${message.startsWith('✅')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : message.startsWith('ℹ️')
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Diagnostic & Offline-First Dexie */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-foret" />
            Base Locale (Dexie.js / Offline)
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
          >
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </span>
        </div>

        {/* Compteurs de la base locale */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-craie p-2.5 rounded-xl border border-sable/50">
            <span className="text-[11px] text-foret/60 block">Pointages en cache</span>
            <span className="text-sm font-bold text-foret">{dbStats.pointagesCount}</span>
          </div>

          <div className="bg-craie p-2.5 rounded-xl border border-sable/50">
            <span className="text-[11px] text-foret/60 block">En attente de synchro</span>
            <span
              className={`text-sm font-bold ${dbStats.unsyncedCount > 0 ? 'text-amber-600 font-extrabold' : 'text-emerald-700'
                }`}
            >
              {dbStats.unsyncedCount}
            </span>
          </div>

          <div className="bg-craie p-2.5 rounded-xl border border-sable/50">
            <span className="text-[11px] text-foret/60 block">Chantiers stockés</span>
            <span className="text-sm font-bold text-foret">{dbStats.chantiersCount}</span>
          </div>

          <div className="bg-craie p-2.5 rounded-xl border border-sable/50">
            <span className="text-[11px] text-foret/60 block">Membres d'équipe</span>
            <span className="text-sm font-bold text-foret">{dbStats.profilesCount}</span>
          </div>
        </div>

        {/* Boutons d'actions offline */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={!isOnline || isSyncing}
            className="w-full py-2.5 px-3 bg-foret hover:bg-foret/90 active:scale-98 text-sable font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing ? 'Synchronisation en cours...' : 'Forcer la synchronisation Supabase'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full py-2 px-3 bg-craie hover:bg-red-50 text-red-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-sable/80"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Réinitialiser les données locales démo</span>
          </button>
        </div>
      </div>

      {/* Guide Installation PWA */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-foret" />
          Installation sur smartphone (PWA)
        </span>
        <div className="space-y-2 text-xs text-foret/80 bg-craie p-3 rounded-xl border border-sable/50">
          <p>
            <strong className="text-foret">Sur iPhone (Safari) :</strong> Appuyez sur le bouton
            de partage en bas d'écran puis sur <em>« Sur l'écran d'accueil »</em>.
          </p>
          <p>
            <strong className="text-foret">Sur Android (Chrome) :</strong> Appuyez sur les 3 points
            en haut puis sur <em>« Installer l'application »</em>.
          </p>
        </div>
      </div>

      {/* À propos de l'application */}
      <div className="bg-white rounded-2xl p-3 border border-sable/80 text-center text-xs text-foret/60 space-y-1">
        <p className="font-bold text-foret">Paysage Concept - Version 1.0.0 (MVP)</p>
        <p className="text-[11px] text-sauge">PWA Mobile-First & Offline-First • Dexie + Supabase</p>
      </div>

      {/* Déconnexion */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 active:scale-98 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-red-200"
      >
        <LogOut className="w-4 h-4" />
        <span>Se déconnecter de la session</span>
      </button>
    </div>
  );
}
