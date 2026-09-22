import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import type { UserRole, Profile } from '../types/database';
import {
  Trees,
  Lock,
  Mail,
  User,
  Shield,
  Loader2,
  ArrowRight,
  UserCheck,
  ShieldCheck,
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
    specificEmail?: string
  ) => {
    setLoading(true);
    setError(null);

    const demoEmail =
      specificEmail ||
      (roleToUse === 'ouvrier'
        ? 'jean.dupont@paysageconcept.fr'
        : 'marc.vasseur@paysageconcept.fr');
    const demoPassword = 'Paysage2026!';

    // Si en ligne, tenter d'abord une vraie authentification Supabase avec JWT
    if (isOnline) {
      const res = await login(demoEmail, demoPassword);
      if (res.success) {
        setLoading(false);
        navigate('/', { replace: true });
        return;
      }
    }

    // Repli immédiat sur le profil local Dexie (mode hors-ligne ou pré-confirmation)
    await loginDemo(roleToUse, specificProfileId);
    setLoading(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-craie flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-sable/70 space-y-5">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-foret flex items-center justify-center text-sable shadow-md">
            <Trees className="w-9 h-9 text-sable" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foret tracking-tight">
              PAYSAGE CONCEPT
            </h1>
            <p className="text-xs text-sauge font-medium">
              Espace terrain ouvriers & chefs d'équipe
            </p>
          </div>
        </div>

        {/* Onglets Connexion / Inscription Supabase */}
        <div className="flex bg-sable/60 p-1 rounded-xl text-xs font-semibold text-foret/80">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mode === 'login' ? 'bg-white text-foret shadow-xs font-bold' : 'hover:text-foret'
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
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mode === 'register' ? 'bg-white text-foret shadow-xs font-bold' : 'hover:text-foret'
              }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouveau compte</span>
          </button>
        </div>

        {/* Message de succès */}
        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed animate-in fade-in duration-200">
            {successNotice}
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* Formulaire Supabase Réel */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foret/80 block">Prénom</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-foret/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Marc"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 bg-craie rounded-xl border border-sable/90 text-xs text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foret/80 block">Nom</label>
                  <input
                    type="text"
                    placeholder="Vasseur"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-3 py-2 bg-craie rounded-xl border border-sable/90 text-xs text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foret/80 block">Rôle</label>
                <div className="relative">
                  <Shield className="w-3.5 h-3.5 text-foret/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-8 pr-3 py-2 bg-craie rounded-xl border border-sable/90 text-xs text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 appearance-none cursor-pointer font-medium"
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
            <label className="text-xs font-semibold text-foret/80 block" htmlFor="email-input">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-foret/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="email-input"
                type="email"
                placeholder="votre.nom@paysageconcept.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 bg-craie rounded-xl border border-sable/90 text-sm text-foret placeholder:text-foret/40 focus:outline-none focus:ring-2 focus:ring-foret/20 focus:border-foret transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foret/80 block" htmlFor="password-input">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-foret/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 bg-craie rounded-xl border border-sable/90 text-sm text-foret placeholder:text-foret/40 focus:outline-none focus:ring-2 focus:ring-foret/20 focus:border-foret transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-foret hover:bg-foret/90 active:scale-98 text-sable font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 mt-1"
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

        {/* Séparateur pour les comptes démo */}
        <div className="relative flex items-center justify-center pt-1">
          <div className="border-t border-sable/80 w-full" />
          <span className="bg-white px-3 text-[10px] font-bold text-sauge uppercase tracking-wider absolute">
            Ou simulation locale démo
          </span>
        </div>

        {/* Boutons Démo */}
        <div className="space-y-2 pt-0.5">
          <button
            type="button"
            onClick={() => handleDemoClick('ouvrier')}
            disabled={loading}
            className="w-full py-2 px-3 bg-craie hover:bg-sable/50 active:scale-98 border border-sable rounded-xl flex items-center justify-between text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foret leading-tight">Jean Dupont</p>
                <p className="text-[10px] text-foret/60">Ouvrier Paysagiste (Démo locale)</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-full">
              Tester
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoClick('chef_equipe')}
            disabled={loading}
            className="w-full py-2 px-3 bg-craie hover:bg-sable/50 active:scale-98 border border-sable rounded-xl flex items-center justify-between text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foret leading-tight">Marc Vasseur</p>
                <p className="text-[10px] text-foret/60">Chef d'Équipe</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-full">
              Tester
            </span>
          </button>

          {/* Autres équipiers */}
          <div className="pt-2 border-t border-sable/50 space-y-1.5">
            <p className="text-[10px] text-foret/60 font-bold uppercase tracking-wider text-center">
              Autres ouvriers de l'équipe
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleDemoClick(
                    'ouvrier',
                    'b3000000-0000-4000-8000-000000000003',
                    'thomas.bernard@paysageconcept.fr'
                  )
                }
                disabled={loading}
                className="py-1.5 px-1 bg-craie hover:bg-sable/40 active:scale-95 border border-sable/70 rounded-lg text-center text-foret text-[11px] font-bold transition-all cursor-pointer truncate"
              >
                Thomas B.
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDemoClick(
                    'ouvrier',
                    'b4000000-0000-4000-8000-000000000004',
                    'lucas.moreau@paysageconcept.fr'
                  )
                }
                disabled={loading}
                className="py-1.5 px-1 bg-craie hover:bg-sable/40 active:scale-95 border border-sable/70 rounded-lg text-center text-foret text-[11px] font-bold transition-all cursor-pointer truncate"
              >
                Lucas M.
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDemoClick(
                    'ouvrier',
                    'b5000000-0000-4000-8000-000000000005',
                    'antoine.petit@paysageconcept.fr'
                  )
                }
                disabled={loading}
                className="py-1.5 px-1 bg-craie hover:bg-sable/40 active:scale-95 border border-sable/70 rounded-lg text-center text-foret text-[11px] font-bold transition-all cursor-pointer truncate"
              >
                Antoine P.
              </button>
            </div>
          </div>
        </div>

        {!isOnline && (
          <p className="text-center text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
            Mode hors-ligne détecté. Les comptes démo restent utilisables sans connexion !
          </p>
        )}
      </div>
    </div>
  );
}
