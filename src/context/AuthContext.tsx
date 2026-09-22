import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { db, INITIAL_PROFILES, ensureSeedData } from '../lib/db';
import type { Profile, UserRole } from '../types/database';
import { AuthContext } from './auth-context-base';

const LOCAL_STORAGE_ACTIVE_PROFILE_KEY = 'paysage_active_profile_id';
const LOCAL_STORAGE_IS_DEMO_KEY = 'paysage_is_demo';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Écouteur réseau En ligne / Hors ligne
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialisation de la session et du profil
  useEffect(() => {
    async function initAuth() {
      try {
        await ensureSeedData();

        const wasDemo = localStorage.getItem(LOCAL_STORAGE_IS_DEMO_KEY) === 'true';
        setIsDemo(wasDemo);

        // 1. Vérifier si un profil est mémorisé en local (mode terrain / offline)
        const savedProfileId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROFILE_KEY);
        if (savedProfileId) {
          const cached = await db.profiles.get(savedProfileId);
          if (cached) {
            setProfile(cached);
            setLoading(false);
            return;
          }
        }

        // 2. Si en ligne, tenter de récupérer la session Supabase
        if (navigator.onLine) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: remoteProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (remoteProfile) {
              await db.profiles.put(remoteProfile);
              localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE_KEY, remoteProfile.id);
              setProfile(remoteProfile);
            }
          }
        }
      } catch (err) {
        console.warn('Erreur chargement session auth:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // Connexion standard Supabase
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Tenter de charger le profil
        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userProfile: Profile = remoteProfile || {
          id: data.user.id,
          nom: 'Utilisateur',
          prenom: data.user.email?.split('@')[0] || 'Ouvrier',
          role: 'ouvrier',
          email: data.user.email,
        };

        await db.profiles.put(userProfile);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE_KEY, userProfile.id);
        localStorage.removeItem(LOCAL_STORAGE_IS_DEMO_KEY);
        setIsDemo(false);
        setProfile(userProfile);
        return { success: true };
      }

      return { success: false, error: 'Utilisateur introuvable' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      };
    } finally {
      setLoading(false);
    }
  };

  // Connexion rapide démo (pour tests instantanés ouvrier / chef d'équipe)
  const loginDemo = async (targetRole: UserRole, targetId?: string): Promise<void> => {
    setLoading(true);
    await ensureSeedData();

    const matched = targetId
      ? INITIAL_PROFILES.find((p) => p.id === targetId) || INITIAL_PROFILES[0]
      : INITIAL_PROFILES.find((p) => p.role === targetRole) || INITIAL_PROFILES[0];
    await db.profiles.put(matched);
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE_KEY, matched.id);
    localStorage.setItem(LOCAL_STORAGE_IS_DEMO_KEY, 'true');
    setIsDemo(true);
    setProfile(matched);
    setLoading(false);
  };

  const logout = async () => {
    try {
      if (navigator.onLine) {
        await supabase.auth.signOut().catch(() => {});
      }
    } finally {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_PROFILE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_IS_DEMO_KEY);
      setIsDemo(false);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        role: profile?.role ?? 'ouvrier',
        loading,
        isOnline,
        isDemo,
        login,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
