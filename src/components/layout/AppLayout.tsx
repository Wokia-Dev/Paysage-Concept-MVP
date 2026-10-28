import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { NetworkBanner } from '../common/NetworkBanner';
import { useAuth } from '../../context/useAuth';
import { Trees } from 'lucide-react';

export function AppLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'chef_equipe':
        return 'Chef';
      case 'admin':
        return 'Admin';
      default:
        return 'Ouvrier';
    }
  };

  const getInitials = () => {
    if (!profile) return 'PC';
    return `${profile.prenom.charAt(0)}${profile.nom.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-craie flex flex-col items-center justify-start text-foret font-sans antialiased">
      {/* Container mobile standardisé (max-w-md) avec centrage sur desktop */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-craie shadow-soft relative border-x border-sable/40 mx-auto">
        {/* Header persistant Vert Forêt incurvé (masqué sur l'accueil au profit du hero header unifié) */}
        {!isHome && (
          <header className="sticky top-0 z-30 bg-foret text-blanc px-4 pt-safe pb-4 rounded-b-2xl shadow-soft flex items-center justify-between border-b border-sauge/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sauge/20 border border-sauge/30 flex items-center justify-center text-sable shadow-xs">
                <Trees className="w-5 h-5 text-sauge" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-white block leading-none">
                  PAYSAGE CONCEPT
                </span>
                <span className="text-[10px] font-medium text-sauge tracking-wider uppercase">
                  {getRoleLabel(profile?.role)} • {profile?.prenom || 'Équipe'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NetworkBanner />
              <div
                className="w-8 h-8 rounded-full bg-sable/20 text-sable font-bold text-xs flex items-center justify-center border border-sauge/40 shadow-xs"
                title={`${profile?.prenom || ''} ${profile?.nom || ''}`}
              >
                {getInitials()}
              </div>
            </div>
          </header>
        )}

        {/* Contenu de page défilant avec dégagement safe-area pour la navigation basse */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 pb-32 pb-[calc(env(safe-area-inset-bottom)+5rem)] no-scrollbar">
          <Outlet />
        </main>

        {/* Bottom Nav persistant */}
        <BottomNav />
      </div>
    </div>
  );
}
