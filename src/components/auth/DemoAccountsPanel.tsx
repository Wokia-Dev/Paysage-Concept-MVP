import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface DemoAccountsPanelProps {
  loading: boolean;
  onDemoClick: (
    roleToUse: 'ouvrier' | 'chef_equipe',
    specificProfileId?: string,
    specificEmail?: string
  ) => void;
}

export const DemoAccountsPanel: React.FC<DemoAccountsPanelProps> = ({
  loading,
  onDemoClick,
}) => {
  return (
    <>
      <div className="relative flex items-center justify-center pt-1">
        <div className="border-t border-sable/80 dark:border-[#2A3F3C] w-full" />
        <span className="bg-white dark:bg-[#172322] px-3 text-[10px] font-bold text-sauge dark:text-[#9BB89B] uppercase tracking-wider absolute">
          Ou simulation locale démo
        </span>
      </div>

      <div className="space-y-2 pt-0.5">
        <button
          type="button"
          onClick={() => onDemoClick('ouvrier')}
          disabled={loading}
          className="w-full py-2 px-3 bg-craie hover:bg-sable/50 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-98 border border-sable dark:border-[#304744] rounded-xl flex items-center justify-between text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foret dark:text-[#EDF2F0] leading-tight">Jean Dupont</p>
              <p className="text-[10px] text-foret/60 dark:text-[#B8C7C2]">Ouvrier Paysagiste (Démo locale)</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-terracotta dark:text-[#E38D69] bg-terracotta/10 dark:bg-terracotta/20 px-2 py-0.5 rounded-full">
            Tester
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDemoClick('chef_equipe')}
          disabled={loading}
          className="w-full py-2 px-3 bg-craie hover:bg-sable/50 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-98 border border-sable dark:border-[#304744] rounded-xl flex items-center justify-between text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foret dark:text-[#EDF2F0] leading-tight">Marc Vasseur</p>
              <p className="text-[10px] text-foret/60 dark:text-[#B8C7C2]">Chef d'Équipe</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-terracotta dark:text-[#E38D69] bg-terracotta/10 dark:bg-terracotta/20 px-2 py-0.5 rounded-full">
            Tester
          </span>
        </button>

        <div className="pt-2 border-t border-sable/50 dark:border-[#2A3F3C] space-y-1.5">
          <p className="text-[10px] text-foret/60 dark:text-[#B8C7C2] font-bold uppercase tracking-wider text-center">
            Autres ouvriers de l'équipe
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() =>
                onDemoClick(
                  'ouvrier',
                  'b3000000-0000-4000-8000-000000000003',
                  'thomas.bernard@paysageconcept.fr'
                )
              }
              disabled={loading}
              className="py-1.5 px-1 bg-craie hover:bg-sable/40 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-95 border border-sable/70 dark:border-[#304744] rounded-lg text-center text-foret dark:text-[#EDF2F0] text-[11px] font-bold transition-all cursor-pointer truncate"
            >
              Thomas B.
            </button>
            <button
              type="button"
              onClick={() =>
                onDemoClick(
                  'ouvrier',
                  'b4000000-0000-4000-8000-000000000004',
                  'lucas.moreau@paysageconcept.fr'
                )
              }
              disabled={loading}
              className="py-1.5 px-1 bg-craie hover:bg-sable/40 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-95 border border-sable/70 dark:border-[#304744] rounded-lg text-center text-foret dark:text-[#EDF2F0] text-[11px] font-bold transition-all cursor-pointer truncate"
            >
              Lucas M.
            </button>
            <button
              type="button"
              onClick={() =>
                onDemoClick(
                  'ouvrier',
                  'b5000000-0000-4000-8000-000000000005',
                  'antoine.petit@paysageconcept.fr'
                )
              }
              disabled={loading}
              className="py-1.5 px-1 bg-craie hover:bg-sable/40 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] active:scale-95 border border-sable/70 dark:border-[#304744] rounded-lg text-center text-foret dark:text-[#EDF2F0] text-[11px] font-bold transition-all cursor-pointer truncate"
            >
              Antoine P.
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
