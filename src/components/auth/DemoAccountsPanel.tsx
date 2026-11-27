import React from 'react';
import { Cloud, HardDrive, ShieldCheck, UserCheck } from 'lucide-react';

export type QuickAuthMode = 'supabase' | 'demo';

interface DemoAccountsPanelProps {
  loading: boolean;
  isOnline: boolean;
  quickAuthMode: QuickAuthMode;
  onChangeQuickAuthMode: (mode: QuickAuthMode) => void;
  onDemoClick: (
    roleToUse: 'ouvrier' | 'chef_equipe',
    specificProfileId?: string,
    specificEmail?: string,
    displayName?: string
  ) => void;
}

const OTHER_WORKERS = [
  {
    id: 'b3000000-0000-4000-8000-000000000003',
    email: 'thomas.bernard@paysageconcept.fr',
    label: 'Thomas B.',
  },
  {
    id: 'b4000000-0000-4000-8000-000000000004',
    email: 'lucas.moreau@paysageconcept.fr',
    label: 'Lucas M.',
  },
  {
    id: 'b5000000-0000-4000-8000-000000000005',
    email: 'antoine.petit@paysageconcept.fr',
    label: 'Antoine P.',
  },
] as const;

export const DemoAccountsPanel: React.FC<DemoAccountsPanelProps> = ({
  loading,
  isOnline,
  quickAuthMode,
  onChangeQuickAuthMode,
  onDemoClick,
}) => {
  const isDemoMode = quickAuthMode === 'demo';
  const badgeLabel = isDemoMode ? 'Démo' : 'Supabase';

  return (
    <>
      <div className="relative flex items-center justify-center pt-1">
        <div className="border-t border-sable/80 dark:border-[#2A3F3C] w-full" />
        <span className="bg-white dark:bg-[#172322] px-3 text-[10px] font-bold text-sauge dark:text-[#9BB89B] uppercase tracking-wider absolute">
          Accès rapide équipe
        </span>
      </div>

      {/* Sélecteur explicite Compte Supabase vs Démo locale */}
      <div className="space-y-1.5 pt-1">
        <div
          role="radiogroup"
          aria-label="Mode de connexion rapide"
          className="grid grid-cols-2 gap-1 bg-sable/60 dark:bg-[#1E2E2C] p-1 rounded-xl border border-sable/60 dark:border-[#304744] text-[11px] font-bold"
        >
          <button
            type="button"
            role="radio"
            aria-checked={quickAuthMode === 'supabase'}
            onClick={() => onChangeQuickAuthMode('supabase')}
            disabled={loading}
            className={`min-h-[48px] px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              quickAuthMode === 'supabase'
                ? 'bg-white text-foret shadow-xs dark:bg-[#2A423F] dark:text-[#EDF2F0]'
                : 'text-foret/65 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>Compte Supabase</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={quickAuthMode === 'demo'}
            onClick={() => onChangeQuickAuthMode('demo')}
            disabled={loading}
            className={`min-h-[48px] px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              quickAuthMode === 'demo'
                ? 'bg-white text-foret shadow-xs dark:bg-[#2A423F] dark:text-[#EDF2F0]'
                : 'text-foret/65 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69] shrink-0" />
            <span>Démo locale</span>
          </button>
        </div>

        <p className="text-[10px] text-center text-foret/65 dark:text-[#B8C7C2] leading-snug">
          {isDemoMode
            ? 'Simulation locale hors-ligne (IndexedDB), sans synchro Supabase.'
            : isOnline
              ? "Connexion réelle Supabase (erreur affichée si le compte n'existe pas)."
              : 'Réseau indisponible : passez en « Démo locale » pour tester hors-ligne.'}
        </p>
      </div>

      <div className="space-y-2 pt-0.5">
        <button
          type="button"
          onClick={() => onDemoClick('ouvrier', undefined, undefined, 'Jean Dupont')}
          disabled={loading}
          className="w-full min-h-[48px] py-2 px-3 bg-craie hover:bg-sable/50 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-98 border border-sable dark:border-[#304744] rounded-xl flex items-center justify-between text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foret dark:text-[#EDF2F0] leading-tight">
                Jean Dupont
              </p>
              <p className="text-[10px] text-foret/60 dark:text-[#B8C7C2]">Ouvrier Paysagiste</p>
            </div>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isDemoMode
                ? 'text-terracotta dark:text-[#E38D69] bg-terracotta/10 dark:bg-terracotta/20'
                : 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80'
            }`}
          >
            {badgeLabel}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDemoClick('chef_equipe', undefined, undefined, 'Marc Vasseur')}
          disabled={loading}
          className="w-full min-h-[48px] py-2 px-3 bg-craie hover:bg-sable/50 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-98 border border-sable dark:border-[#304744] rounded-xl flex items-center justify-between text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foret dark:text-[#EDF2F0] leading-tight">
                Marc Vasseur
              </p>
              <p className="text-[10px] text-foret/60 dark:text-[#B8C7C2]">Chef d'Équipe</p>
            </div>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isDemoMode
                ? 'text-terracotta dark:text-[#E38D69] bg-terracotta/10 dark:bg-terracotta/20'
                : 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80'
            }`}
          >
            {badgeLabel}
          </span>
        </button>

        <div className="pt-2 border-t border-sable/50 dark:border-[#2A3F3C] space-y-1.5">
          <p className="text-[10px] text-foret/60 dark:text-[#B8C7C2] font-bold uppercase tracking-wider text-center">
            Autres ouvriers de l'équipe
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {OTHER_WORKERS.map((worker) => (
              <button
                key={worker.id}
                type="button"
                onClick={() => onDemoClick('ouvrier', worker.id, worker.email, worker.label)}
                disabled={loading}
                className="min-h-[48px] py-1.5 px-1 bg-craie hover:bg-sable/40 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-95 border border-sable/70 dark:border-[#304744] rounded-lg text-center text-foret dark:text-[#EDF2F0] text-[11px] font-bold transition-all cursor-pointer truncate"
              >
                {worker.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
