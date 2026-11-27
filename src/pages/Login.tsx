import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import type { UserRole, Profile } from '../types/database';
import { DemoAccountsPanel, type QuickAuthMode } from '../components/auth/DemoAccountsPanel';
import { ThemeSelector } from '../components/common/ThemeSelector';
import logoUrl from '../assets/logo.png';
import {
  Lock,
  Mail,
  User,
  Shield,
  Loader2,
  ArrowRight,
  UserPlus,
  LogIn
} from 'lucide-react';

export function Login() {
  const { login, loginDemo, isOnline } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [role, setRole] = useState<UserRole>('ouvrier');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [quickAuthMode, setQuickAuthMode] = useState<QuickAuthMode>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'demo' : 'supabase'
  );
  const [demoFallbackCandidate, setDemoFallbackCandidate] = useState<{
    roleToUse: 'ouvrier' | 'chef_equipe';
    specificProfileId?: string;
    label: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!email || !password) {
      setError('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);

    if (mode === 'register') {
      if (!nom || !prenom) {
        setError('Veuillez renseigner votre nom et prénom.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nom,
              prenom,
              role,
            },
          },
        });

        if (signUpErr) {
          setError(signUpErr.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Si l'utilisateur est confirmé directement (ou session active)
          if (data.session) {
            const userProfile: Profile = {
              id: data.user.id,
              nom,
              prenom,
              role,
              email,
            };
            await db.profiles.put(userProfile);
            localStorage.setItem('paysage_active_profile_id', userProfile.id);
            localStorage.removeItem('paysage_is_demo');
            navigate('/', { replace: true });
            return;
          }

          // Sinon, e-mail de confirmation requis par Supabase
          setSuccessNotice(
            `Compte créé dans Supabase ! Si l'option 'Confirm Email' est activée dans votre projet Supabase, confirmez-le dans Supabase (Auth > Users) ou via l'email reçu, puis connectez-vous.`
          );
          setMode('login');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mode Connexion standard
    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/', { replace: true });
    } else {
      setError(
        res.error === 'Email not confirmed'
          ? "Votre compte Supabase existe mais n'est pas encore confirmé. Confirmez-le dans Supabase (Auth > Users) ou désactivez 'Confirm email' dans les paramètres Supabase."
          : res.error || 'Identifiants invalides ou problème de connexion.'
      );
    }
  };

  const handleDemoClick = async (
    roleToUse: 'ouvrier' | 'chef_equipe',
    specificProfileId?: string,
    specificEmail?: string,
    displayName?: string
  ) => {
    setLoading(true);
    setError(null);
    setSuccessNotice(null);
    setDemoFallbackCandidate(null);

    if (quickAuthMode === 'demo') {
      await loginDemo(roleToUse, specificProfileId);
      setLoading(false);
      navigate('/', { replace: true });
      return;
    }

    const label =
      displayName || (roleToUse === 'chef_equipe' ? 'Marc Vasseur' : 'Jean Dupont');
    const currentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : isOnline;

    if (!currentlyOnline) {
      setError(
        'Connexion réseau indisponible pour authentifier ce compte Supabase.'
      );
      setDemoFallbackCandidate({ roleToUse, specificProfileId, label });
      setLoading(false);
      return;
    }

    const demoEmail =
      specificEmail ||
      (roleToUse === 'ouvrier'
        ? 'jean.dupont@paysageconcept.fr'
        : 'marc.vasseur@paysageconcept.fr');
    const demoPassword = 'Paysage2026!';

    const res = await login(demoEmail, demoPassword);
    setLoading(false);

    if (res.success) {
      navigate('/', { replace: true });
      return;
    }

    setError(
      `Échec de connexion Supabase pour ${label} : ${res.error || 'identifiants ou réseau invalides'}.`
    );
    setDemoFallbackCandidate({ roleToUse, specificProfileId, label });
  };

  const handleConfirmDemoFallback = async () => {
    if (!demoFallbackCandidate) return;
    setLoading(true);
    setError(null);
    await loginDemo(demoFallbackCandidate.roleToUse, demoFallbackCandidate.specificProfileId);
    setLoading(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-craie dark:bg-[#0F1716] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex justify-end mb-2">
        <ThemeSelector compact />
      </div>
      <div className="w-full max-w-sm bg-white dark:bg-[#172322] rounded-3xl p-6 shadow-xl border border-sable/70 dark:border-[#2A3F3C] space-y-5">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-black">
            <img
              src={logoUrl}
              alt="Paysage Concept"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foret dark:text-[#EDF2F0] tracking-tight">
              PAYSAGE CONCEPT
            </h1>
            <p className="text-xs text-sauge dark:text-[#9BB89B] font-medium">
              Espace terrain ouvriers & chefs d'équipe
            </p>
          </div>
        </div>

        {/* Onglets Connexion / Inscription Supabase */}
        <div className="flex bg-sable/60 dark:bg-[#1E2E2C] p-1 rounded-xl text-xs font-semibold text-foret/80 dark:text-[#B8C7C2]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mode === 'login' ? 'bg-white text-foret shadow-xs font-bold dark:bg-[#2A423F] dark:text-[#EDF2F0]' : 'hover:text-foret dark:hover:text-[#EDF2F0]'
              }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Connexion</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mode === 'register' ? 'bg-white text-foret shadow-xs font-bold dark:bg-[#2A423F] dark:text-[#EDF2F0]' : 'hover:text-foret dark:hover:text-[#EDF2F0]'
              }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouveau compte</span>
          </button>
        </div>

        {/* Message de succès */}
        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 dark:bg-emerald-950/75 dark:border-emerald-700/60 dark:text-emerald-200 leading-relaxed animate-in fade-in duration-200">
            {successNotice}
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 dark:bg-rose-950/75 dark:border-rose-700/60 dark:text-rose-200 leading-relaxed space-y-2 animate-in fade-in duration-200">
            <p>{error}</p>
            {demoFallbackCandidate && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleConfirmDemoFallback()}
                className="w-full min-h-[48px] px-3 py-2 rounded-xl bg-white dark:bg-[#172322] border border-red-300 dark:border-rose-700/60 text-foret dark:text-[#EDF2F0] font-bold text-xs hover:bg-craie dark:hover:bg-[#1E2E2C] transition-all cursor-pointer"
              >
                Continuer en Démo locale ({demoFallbackCandidate.label})
              </button>
            )}
          </div>
        )}

        {/* Formulaire Supabase Réel */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block">Prénom</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-foret/40 dark:text-[#8FA5A0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Marc"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 bg-craie dark:bg-[#1E2E2C] rounded-xl border border-sable/90 dark:border-[#304744] text-xs text-foret dark:text-[#EDF2F0] dark:placeholder:text-[#8FA5A0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block">Nom</label>
                  <input
                    type="text"
                    placeholder="Vasseur"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-3 py-2 bg-craie dark:bg-[#1E2E2C] rounded-xl border border-sable/90 dark:border-[#304744] text-xs text-foret dark:text-[#EDF2F0] dark:placeholder:text-[#8FA5A0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block">Rôle</label>
                <div className="relative">
                  <Shield className="w-3.5 h-3.5 text-foret/40 dark:text-[#8FA5A0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-8 pr-3 py-2 bg-craie dark:bg-[#1E2E2C] rounded-xl border border-sable/90 dark:border-[#304744] text-xs text-foret dark:text-[#EDF2F0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40 appearance-none cursor-pointer font-medium"
                  >
                    <option value="ouvrier">Ouvrier paysagiste</option>
                    <option value="chef_equipe">Chef d'équipe</option>
                    <option value="admin">Administrateur / Conducteur</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block" htmlFor="email-input">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-foret/40 dark:text-[#8FA5A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="email-input"
                type="email"
                placeholder="votre.nom@paysageconcept.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 bg-craie dark:bg-[#1E2E2C] rounded-xl border border-sable/90 dark:border-[#304744] text-sm text-foret dark:text-[#EDF2F0] placeholder:text-foret/40 dark:placeholder:text-[#8FA5A0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40 focus:border-foret dark:focus:border-[#4EB0A2] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block" htmlFor="password-input">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-foret/40 dark:text-[#8FA5A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 bg-craie dark:bg-[#1E2E2C] rounded-xl border border-sable/90 dark:border-[#304744] text-sm text-foret dark:text-[#EDF2F0] placeholder:text-foret/40 dark:placeholder:text-[#8FA5A0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40 focus:border-foret dark:focus:border-[#4EB0A2] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] active:scale-98 text-sable dark:text-[#EDF2F0] font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md dark:shadow-none transition-all cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-sable" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Se connecter à Supabase' : 'Créer le compte Supabase'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Comptes accès rapide */}
        <DemoAccountsPanel
          loading={loading}
          isOnline={isOnline}
          quickAuthMode={quickAuthMode}
          onChangeQuickAuthMode={(nextMode) => {
            setQuickAuthMode(nextMode);
            setError(null);
            setDemoFallbackCandidate(null);
          }}
          onDemoClick={handleDemoClick}
        />

        {!isOnline && (
          <p className="text-center text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 dark:text-amber-300 dark:bg-amber-950/70 dark:border-amber-700/60">
            Mode hors-ligne détecté. Les comptes démo restent utilisables sans connexion !
          </p>
        )}
      </div>
    </div>
  );
}
