import React from 'react';
import { CloudRain, CloudSun, Sun } from 'lucide-react';
import type { Profile } from '../../types/database';
import type { WeatherInfo } from '../../lib/weather';
import { getInitials, getRoleLabel } from '../../lib/formatters';
import { NetworkBanner } from '../common/NetworkBanner';
import { LogoOutline } from '../common/LogoOutline';
import { WeeklyCalendarStrip } from '../common/WeeklyCalendarStrip';

interface HomeHeaderProps {
  profile: Profile | null;
  weather: WeatherInfo | null;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  profile,
  weather,
  selectedDateStr,
  onSelectDate,
}) => {
  const userInitials = getInitials(profile?.prenom, profile?.nom, 'JD');

  return (
    <section
      className="-mx-4 -mt-4 text-white px-5 pt-[calc(env(safe-area-inset-top,0px)+1.75rem)] pb-8 rounded-b-3xl shadow-soft space-y-5 relative overflow-hidden bg-foret"
      style={{
        backgroundColor: '#15302F',
        backgroundImage: `
      /* 1. Halo chaud d'ambiance en bas à gauche */
      radial-gradient(circle 260px at 0% 100%, rgba(196, 116, 82, 0.25) 0%, transparent 75%),

      /* 2. Masque horizontal renforcé */
      linear-gradient(90deg, rgba(21, 48, 47, 0.96) 0%, rgba(21, 48, 47, 0.85) 25%, rgba(21, 48, 47, 0.45) 45%, rgba(21, 48, 47, 0.25) 100%),

      /* 3. Masque vertical renforcé avec couverture intégrale du safe-area status bar */
      linear-gradient(180deg, #15302F 0%, rgba(21, 48, 47, 0.96) 18%, rgba(21, 48, 47, 0.45) 42%, rgba(21, 48, 47, 0.65) 65%, #15302F 85%, #15302F 100%),

      /* 4. Halo sauge discret déplacé hors de la zone d'encoche */
      radial-gradient(circle 300px at 100% 35%, rgba(143, 169, 143, 0.2) 0%, transparent 75%),

      /* 5. Voile global pour atténuer directement l'image */
      linear-gradient(rgba(21, 48, 47, 0.4), rgba(21, 48, 47, 0.4)),

      /* 6. Image d'arrière-plan */
      url('${import.meta.env.BASE_URL}hero-paysage.jpg')
    `,
        backgroundSize: 'auto, auto, auto, auto, auto, cover',
        backgroundPosition: 'center, center, center, center, center, right top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Ligne 1 : Branding, Rôle, NetworkBanner, Avatar unique */}
      <div className="flex items-center justify-between pt-1.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sauge/20 border border-sauge/30 flex items-center justify-center text-sauge shadow-xs shrink-0">
            <LogoOutline className="w-4.5 h-4.5 text-sauge" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sauge block leading-none">
              PAYSAGE CONCEPT
            </span>
            <span className="text-xs font-bold text-white/90">
              {getRoleLabel(profile?.role, 'full')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <NetworkBanner />
          <div
            className="w-9 h-9 rounded-full bg-sable/20 text-sable font-bold text-xs flex items-center justify-center border border-sauge/40 shadow-xs"
            title={`${profile?.prenom || ''} ${profile?.nom || ''}`}
          >
            {userInitials}
          </div>
        </div>
      </div>

      {/* Ligne 2 : Salutation personnalisée & Widget Météo au sommet */}
      <div className="flex items-center justify-between gap-3 relative z-10 pt-0.5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            Bonjour {profile?.prenom || 'Jean'} 👋
          </h1>
          <p className="text-xs text-sauge font-medium mt-0.5">
            Voici un aperçu de votre journée
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-3xl bg-white/10 backdrop-blur-xs border border-white/15 text-white shadow-2xs hover:bg-white/15 transition-all cursor-default shrink-0"
          title={`Météo chantier : ${weather ? `${weather.temperature}°C, ${weather.description}` : '11°C'}`}
        >
          <span className="sr-only">Météo chantier</span>
          {weather?.iconName === 'cloud-rain' ? (
            <CloudRain className="w-4 h-4 text-sky-300 shrink-0" />
          ) : weather?.iconName === 'sun' ? (
            <Sun className="w-4 h-4 text-amber-300 shrink-0" />
          ) : (
            <CloudSun className="w-4 h-4 text-amber-300 shrink-0" />
          )}
          <span className="text-sm font-bold text-white tracking-tight">
            {weather ? `${weather.temperature}°C` : '11°C'}
          </span>
        </div>
      </div>

      {/* Ligne 3 : Bandeau Calendrier Hebdomadaire Interactif */}
      <div className="relative z-10">
        <WeeklyCalendarStrip selectedDate={selectedDateStr} onSelectDate={onSelectDate} />
      </div>
    </section>
  );
};
