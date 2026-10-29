import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { NetworkBanner } from '../common/NetworkBanner';
import { useAuth } from '../../context/useAuth';
import { LogoOutline } from '../common/LogoOutline';

export function AppLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const mainRef = useRef<HTMLElement>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      mainRef.current.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  // Support global keyboard scrolling (PageDown, PageUp, ArrowDown, ArrowUp, Space, Home, End)
  // regardless of which non-input element was clicked.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mainRef.current) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          activeEl.isContentEditable ||
          Boolean(activeEl.closest('[role="dialog"]')));

      if (isInput) return;

      const pageStep = (mainRef.current.clientHeight || 600) * 0.8;

      switch (e.key) {
        case 'ArrowDown':
          mainRef.current.scrollTop += 60;
          e.preventDefault();
          break;
        case 'ArrowUp':
          mainRef.current.scrollTop -= 60;
          e.preventDefault();
          break;
        case 'PageDown':
          mainRef.current.scrollTop += pageStep;
          e.preventDefault();
          break;
        case 'PageUp':
          mainRef.current.scrollTop -= pageStep;
          e.preventDefault();
          break;
        case ' ':
          if (!activeEl || activeEl === document.body || activeEl === mainRef.current) {
            mainRef.current.scrollTop += e.shiftKey ? -pageStep : pageStep;
            e.preventDefault();
          }
          break;
        case 'Home':
          if (!activeEl || activeEl === document.body || activeEl === mainRef.current) {
            mainRef.current.scrollTop = 0;
            e.preventDefault();
          }
          break;
        case 'End':
          if (!activeEl || activeEl === document.body || activeEl === mainRef.current) {
            mainRef.current.scrollTop = mainRef.current.scrollHeight;
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (!mainRef.current) return;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('[role="dialog"]')) return;

    // If wheel event occurs outside main scroller (desktop margins, header, bottom nav),
    // forward deltaY to main container to eliminate scroll freeze dead zones.
    if (!mainRef.current.contains(e.target as Node)) {
      mainRef.current.scrollTop += e.deltaY;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!mainRef.current) return;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('[role="dialog"]')) return;

    if (!mainRef.current.contains(e.target as Node)) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!mainRef.current || touchStartY.current === null) return;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('[role="dialog"]')) return;

    if (!mainRef.current.contains(e.target as Node)) {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY.current - currentY;
      mainRef.current.scrollTop += deltaY;
      touchStartY.current = currentY;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

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
    <div
      className="min-h-screen h-screen h-[100dvh] bg-craie flex flex-col items-center justify-start text-foret font-sans antialiased overflow-hidden"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Safe Area Status Bar Cover: Keeps top safe-area and status bar appearance Forest Green (#15302F) across all routes during scroll */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top,0px)] bg-foret z-40 pointer-events-none" />

      {/* Container mobile standardisé (max-w-md) avec centrage sur desktop */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-craie h-screen h-[100dvh] shadow-soft relative border-sable/40 mx-auto overflow-hidden">
        {/* Header persistant Vert Forêt incurvé (masqué sur l'accueil au profit du hero header unifié) */}
        {!isHome && (
          <header className="sticky top-0 z-30 bg-foret text-blanc px-4 pt-safe pb-4 rounded-b-2xl shadow-soft flex items-center justify-between border-b border-sauge/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sauge/20 border border-sauge/30 flex items-center justify-center text-sauge shadow-xs shrink-0">
                <LogoOutline className="w-5 h-5 text-sauge" />
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
        <main
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4 pb-24 pb-[calc(env(safe-area-inset-bottom)+5rem)] no-scrollbar focus:outline-none"
        >
          <Outlet />
        </main>

        {/* Bottom Nav persistant */}
        <BottomNav />
      </div>
    </div>
  );
}
