import { useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Database,
  Info,
  LogOut,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { usePlusDiagnostics } from '../hooks/usePlusDiagnostics';
import { getRoleBadgeConfig, getRoleLabel, isSupervisorRole } from '../lib/formatters';
import { ThemeSelector } from '../components/common/ThemeSelector';
import logoUrl from '../assets/logo.png';

export function Plus() {
  const { profile, logout, isOnline, isDemo } = useAuth();
  const navigate = useNavigate();
  const { dbStats, isSyncing, message, handleSyncNow, handleResetDemoData } =
    usePlusDiagnostics(isOnline);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-4 max-w-md mx-auto pb-6">
      {/* 1. En-tête Biophilique */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foret dark:text-[#EDF2F0] tracking-tight">Plus d'options</h1>
          <p className="text-xs text-sauge dark:text-[#9BB89B] font-medium mt-0.5">
            Profil, apparence, cache local et PWA
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-sable/60 dark:bg-[#1E2E2C] text-foret dark:text-[#9BB89B] flex items-center justify-center shrink-0">
          <Sliders className="w-5 h-5 text-foret dark:text-[#9BB89B]" />
        </div>
      </div>

      {/* 2. Profil de l'utilisateur */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-foret dark:bg-[#235852] text-sable dark:text-[#D5E6DC] font-extrabold text-base flex items-center justify-center shadow-xs shrink-0">
            {profile?.prenom?.charAt(0) || 'U'}
            {profile?.nom?.charAt(0) || ''}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-extrabold text-foret dark:text-[#EDF2F0] leading-snug truncate">
                {profile?.prenom} {profile?.nom}
              </h2>
              {isDemo ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/75 dark:text-amber-300 dark:border-amber-700/60">
                  Démo Locale
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border-emerald-700/60">
                  Compte Supabase
                </span>
              )}
            </div>
            <p className="text-xs text-sauge dark:text-[#9BB89B] font-semibold flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeConfig(profile?.role).className}`}
              >
                {getRoleLabel(profile?.role, 'full')}
              </span>
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-sable/50 dark:border-[#2A3F3C] space-y-1.5 text-xs text-foret/80 dark:text-[#B8C7C2]">
          {profile?.telephone && (
            <p>
              <span className="font-bold text-foret dark:text-[#EDF2F0]">Téléphone : </span>
              {profile.telephone}
            </p>
          )}
          {profile?.email && (
            <p>
              <span className="font-bold text-foret dark:text-[#EDF2F0]">Email : </span>
              {profile.email}
            </p>
          )}
        </div>

        {isDemo && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-300 text-xs text-amber-950 dark:bg-amber-950/60 dark:border-amber-700/50 dark:text-amber-200 rounded-2xl leading-relaxed">
            <strong className="block font-bold mb-0.5">Mode Démo Local actif :</strong>
            Les données sont stockées dans le cache IndexedDB du navigateur. Pour envoyer les
            pointages vers votre vraie base Supabase PostgreSQL, connectez-vous avec un compte
            Supabase réel depuis l'écran de connexion.
          </div>
        )}
      </div>

      {/* 2b. Apparence & Thème d'affichage */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
          Apparence & Thème
        </span>
        <ThemeSelector />
      </div>

      {/* 3. Feedback toast / message */}
      {message && (
        <div
          className={`p-3.5 border text-xs rounded-2xl flex items-start gap-2.5 leading-relaxed shadow-soft animate-in fade-in duration-200 ${
            message.startsWith('✅')
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/75 dark:border-emerald-700/60 dark:text-emerald-200'
              : message.startsWith('ℹ️')
                ? 'bg-sky-50 border-sky-300 text-sky-950 dark:bg-sky-950/75 dark:border-sky-700/60 dark:text-sky-200'
                : 'bg-amber-50 border-amber-300 text-amber-950 dark:bg-amber-950/75 dark:border-amber-700/60 dark:text-amber-200'
          }`}
        >
          {message.startsWith('✅') ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
          ) : message.startsWith('ℹ️') ? (
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-700 dark:text-sky-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Espace Gestion / Chantiers pour Chef d'équipe */}
      {isSupervisorRole(profile?.role) && (
        <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
            Gestion des chantiers
          </span>
          <Link
            to="/chantiers"
            className="w-full min-h-[48px] py-3 px-4 bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] active:scale-98 text-white font-bold text-xs rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sable dark:text-[#D5E6DC]">
                <Briefcase className="w-4 h-4 text-sable dark:text-[#D5E6DC]" />
              </div>
              <div className="text-left">
                <span className="block text-white font-bold">Catalogue des chantiers</span>
                <span className="block text-[10px] text-sauge dark:text-[#9BB89B] font-medium">
                  Gestion globale & affectations
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-sauge dark:text-[#9BB89B]" />
          </Link>
        </div>
      )}

      {/* 4. Diagnostic & Offline-First Dexie */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
            <Database className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
            Base Locale (Dexie.js / Offline)
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border-emerald-700/60'
                : 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/75 dark:text-amber-300 dark:border-amber-700/60'
            }`}
          >
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-craie dark:bg-[#1E2E2C] p-3 rounded-2xl border border-sable/60 dark:border-[#304744]">
            <span className="text-[11px] text-foret/70 dark:text-[#B8C7C2] block font-medium">Pointages en cache</span>
            <span className="text-base font-extrabold text-foret dark:text-[#EDF2F0]">{dbStats.pointagesCount}</span>
          </div>

          <div className="bg-craie dark:bg-[#1E2E2C] p-3 rounded-2xl border border-sable/60 dark:border-[#304744]">
            <span className="text-[11px] text-foret/70 dark:text-[#B8C7C2] block font-medium">
              En attente de synchro
            </span>
            <span
              className={`text-base font-extrabold ${
                dbStats.unsyncedCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {dbStats.unsyncedCount}
            </span>
          </div>

          <div className="bg-craie dark:bg-[#1E2E2C] p-3 rounded-2xl border border-sable/60 dark:border-[#304744]">
            <span className="text-[11px] text-foret/70 dark:text-[#B8C7C2] block font-medium">Chantiers stockés</span>
            <span className="text-base font-extrabold text-foret dark:text-[#EDF2F0]">{dbStats.chantiersCount}</span>
          </div>

          <div className="bg-craie dark:bg-[#1E2E2C] p-3 rounded-2xl border border-sable/60 dark:border-[#304744]">
            <span className="text-[11px] text-foret/70 dark:text-[#B8C7C2] block font-medium">Membres d'équipe</span>
            <span className="text-base font-extrabold text-foret dark:text-[#EDF2F0]">{dbStats.profilesCount}</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={!isOnline || isSyncing}
            className="w-full min-h-[48px] py-3 px-4 bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] active:scale-98 text-sable dark:text-[#EDF2F0] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing ? 'Synchronisation en cours...' : 'Forcer la synchronisation Supabase'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full min-h-[48px] py-3 px-4 bg-craie hover:bg-red-50 text-red-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-sable/80 active:scale-98 dark:bg-[#1E2E2C] dark:hover:bg-rose-950/60 dark:text-rose-300 dark:border-[#304744]"
          >
            <Trash2 className="w-4 h-4 text-red-700 dark:text-rose-400" />
            <span>Réinitialiser les données locales démo</span>
          </button>
        </div>
      </div>

      {/* 5. Guide Installation PWA */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
          Installation sur smartphone (PWA)
        </span>
        <div className="space-y-2 text-xs text-foret/80 dark:text-[#B8C7C2] bg-craie dark:bg-[#1E2E2C] p-3.5 rounded-2xl border border-sable/60 dark:border-[#304744] leading-relaxed">
          <p>
            <strong className="text-foret dark:text-[#EDF2F0]">Sur iPhone (Safari) :</strong> Appuyez sur le bouton de
            partage en bas d'écran puis sur <em>« Sur l'écran d'accueil »</em>.
          </p>
          <p>
            <strong className="text-foret dark:text-[#EDF2F0]">Sur Android (Chrome) :</strong> Appuyez sur les 3 points en
            haut puis sur <em>« Installer l'application »</em>.
          </p>
        </div>
      </div>

      {/* 6. À propos de l'application */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 border border-sable/80 dark:border-[#2A3F3C] shadow-soft text-center text-xs text-foret/70 dark:text-[#B8C7C2] flex flex-col items-center space-y-2">
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-xs bg-black flex items-center justify-center">
          <img src={logoUrl} alt="Paysage Concept" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-extrabold text-foret dark:text-[#EDF2F0]">Paysage Concept — Version 1.0.0 (MVP)</p>
          <p className="text-[11px] text-sauge dark:text-[#9BB89B] font-medium">
            PWA Mobile-First & Offline-First • Dexie + Supabase
          </p>
        </div>
      </div>

      {/* 7. Déconnexion */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full min-h-[48px] py-3.5 px-4 bg-red-50 hover:bg-red-100 active:scale-98 text-red-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-red-300 shadow-xs dark:bg-rose-950/60 dark:hover:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60"
      >
        <LogOut className="w-4 h-4 text-red-700 dark:text-rose-400" />
        <span>Se déconnecter de la session</span>
      </button>
    </div>
  );
}
