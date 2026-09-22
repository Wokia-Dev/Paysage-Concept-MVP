import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { NetworkBanner } from '../common/NetworkBanner';
import { useAuth } from '../../context/useAuth';
import { Trees } from 'lucide-react';

export function AppLayout() {
  const { profile } = useAuth();

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
      {/* Container mobile standardisé (390px - 448px) avec centrage sur desktop */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-white shadow-xl relative border-x border-sable/40">
        {/* Header persistant */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sable/70 px-4 py-3 flex items-center justify-between pt-safe">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-foret flex items-center justify-center text-sable shadow-xs">
              <Trees className="w-5 h-5 text-sable" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-foret block leading-none">
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
              className="w-8 h-8 rounded-full bg-sable/80 text-foret font-bold text-xs flex items-center justify-center border border-sauge/40 shadow-xs"
              title={`${profile?.prenom || ''} ${profile?.nom || ''}`}
            >
              {getInitials()}
            </div>
          </div>
        </header>

        {/* Contenu de page défilant */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <Outlet />
        </main>

        {/* Bottom Nav persistant */}
        <BottomNav />
      </div>
    </div>
  );
}
