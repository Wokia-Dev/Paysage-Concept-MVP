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
  Sliders,
  AlertCircle,
  Info,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

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
    <div className="space-y-4 max-w-md mx-auto pb-6">
      {/* 1. En-tête Biophilique */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 shadow-soft flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foret tracking-tight">Plus d'options</h1>
          <p className="text-xs text-sauge font-medium mt-0.5">
            Profil, cache local et gestion PWA
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-sable/60 text-foret flex items-center justify-center shrink-0">
          <Sliders className="w-5 h-5 text-foret" />
        </div>
      </div>

      {/* 2. Profil de l'utilisateur */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 shadow-soft space-y-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-foret text-sable font-extrabold text-base flex items-center justify-center shadow-xs shrink-0">
            {profile?.prenom?.charAt(0) || 'U'}
            {profile?.nom?.charAt(0) || ''}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-extrabold text-foret leading-snug truncate">
                {profile?.prenom} {profile?.nom}
              </h2>
              {isDemo ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                  Démo Locale
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                  Compte Supabase
                </span>
              )}
            </div>
            <p className="text-xs text-sauge capitalize font-semibold flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {profile?.role === 'chef_equipe'
                  ? "Chef d'équipe"
                  : profile?.role === 'admin'
                    ? 'Administrateur / Conducteur'
                    : 'Ouvrier paysagiste'}
              </span>
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-sable/50 space-y-1.5 text-xs text-foret/80">
          {profile?.telephone && (
            <p>
              <span className="font-bold text-foret">Téléphone : </span>
              {profile.telephone}
            </p>
          )}
          {profile?.email && (
            <p>
              <span className="font-bold text-foret">Email : </span>
              {profile.email}
            </p>
          )}
        </div>

        {isDemo && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-300 text-xs text-amber-950 rounded-2xl leading-relaxed">
            <strong className="block font-bold mb-0.5">Mode Démo Local actif :</strong>
            Les données sont stockées dans le cache IndexedDB du navigateur. Pour envoyer les
            pointages vers votre vraie base Supabase PostgreSQL, connectez-vous avec un compte
            Supabase réel depuis l'écran de connexion.
          </div>
        )}
      </div>

      {/* 3. Feedback toast / message */}
      {message && (
        <div
          className={`p-3.5 border text-xs rounded-2xl flex items-start gap-2.5 leading-relaxed shadow-soft animate-in fade-in duration-200 ${
            message.startsWith('✅')
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : message.startsWith('ℹ️')
                ? 'bg-sky-50 border-sky-300 text-sky-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          {message.startsWith('✅') ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
          ) : message.startsWith('ℹ️') ? (
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-700" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Espace Gestion / Chantiers pour Chef d'équipe & Admin */}
      {(profile?.role === 'chef_equipe' || profile?.role === 'admin') && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 shadow-soft space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-foret" />
            Gestion des chantiers
          </span>
          <Link
            to="/chantiers"
            className="w-full min-h-[48px] py-3 px-4 bg-foret hover:bg-foret/90 active:scale-98 text-white font-bold text-xs rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sable">
                <Briefcase className="w-4 h-4 text-sable" />
              </div>
              <div className="text-left">
                <span className="block text-white font-bold">Catalogue des chantiers</span>
                <span className="block text-[10px] text-sauge font-medium">Gestion globale & affectations</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-sauge" />
          </Link>
        </div>
      )}

      {/* 4. Diagnostic & Offline-First Dexie */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
            <Database className="w-4 h-4 text-foret" />
            Base Locale (Dexie.js / Offline)
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                : 'bg-amber-100 text-amber-950 border-amber-300'
            }`}
          >
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </span>
        </div>

        {/* Compteurs de la base locale */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-craie p-3 rounded-2xl border border-sable/60">
            <span className="text-[11px] text-foret/70 block font-medium">Pointages en cache</span>
            <span className="text-base font-extrabold text-foret">{dbStats.pointagesCount}</span>
          </div>

          <div className="bg-craie p-3 rounded-2xl border border-sable/60">
            <span className="text-[11px] text-foret/70 block font-medium">En attente de synchro</span>
            <span
              className={`text-base font-extrabold ${
                dbStats.unsyncedCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {dbStats.unsyncedCount}
            </span>
          </div>

          <div className="bg-craie p-3 rounded-2xl border border-sable/60">
            <span className="text-[11px] text-foret/70 block font-medium">Chantiers stockés</span>
            <span className="text-base font-extrabold text-foret">{dbStats.chantiersCount}</span>
          </div>

          <div className="bg-craie p-3 rounded-2xl border border-sable/60">
            <span className="text-[11px] text-foret/70 block font-medium">Membres d'équipe</span>
            <span className="text-base font-extrabold text-foret">{dbStats.profilesCount}</span>
          </div>
        </div>

        {/* Boutons d'actions offline avec min-h-[48px] touch targets */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={!isOnline || isSyncing}
            className="w-full min-h-[48px] py-3 px-4 bg-foret hover:bg-foret/90 active:scale-98 text-sable font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing ? 'Synchronisation en cours...' : 'Forcer la synchronisation Supabase'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full min-h-[48px] py-3 px-4 bg-craie hover:bg-red-50 text-red-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-sable/80 active:scale-98"
          >
            <Trash2 className="w-4 h-4 text-red-700" />
            <span>Réinitialiser les données locales démo</span>
          </button>
        </div>
      </div>

      {/* 5. Guide Installation PWA */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 shadow-soft space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-foret" />
          Installation sur smartphone (PWA)
        </span>
        <div className="space-y-2 text-xs text-foret/80 bg-craie p-3.5 rounded-2xl border border-sable/60 leading-relaxed">
          <p>
            <strong className="text-foret">Sur iPhone (Safari) :</strong> Appuyez sur le bouton de
            partage en bas d'écran puis sur <em>« Sur l'écran d'accueil »</em>.
          </p>
          <p>
            <strong className="text-foret">Sur Android (Chrome) :</strong> Appuyez sur les 3 points en
            haut puis sur <em>« Installer l'application »</em>.
          </p>
        </div>
      </div>

      {/* 6. À propos de l'application */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 border border-sable/80 shadow-soft text-center text-xs text-foret/70 flex flex-col items-center space-y-2">
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-xs bg-black flex items-center justify-center">
          <img src="/logo.png" alt="Paysage Concept" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-extrabold text-foret">Paysage Concept — Version 1.0.0 (MVP)</p>
          <p className="text-[11px] text-sauge font-medium">
            PWA Mobile-First & Offline-First • Dexie + Supabase
          </p>
        </div>
      </div>

      {/* 7. Déconnexion avec min-h-[48px] touch target */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full min-h-[48px] py-3.5 px-4 bg-red-50 hover:bg-red-100 active:scale-98 text-red-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-red-300 shadow-xs"
      >
        <LogOut className="w-4 h-4 text-red-700" />
        <span>Se déconnecter de la session</span>
      </button>
    </div>
  );
}
