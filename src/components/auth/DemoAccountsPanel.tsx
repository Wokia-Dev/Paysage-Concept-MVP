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
        <div className="border-t border-sable/80 w-full" />
        <span className="bg-white px-3 text-[10px] font-bold text-sauge uppercase tracking-wider absolute">
          Ou simulation locale démo
        </span>
      </div>

      <div className="space-y-2 pt-0.5">
        <button
          type="button"
          onClick={() => onDemoClick('ouvrier')}
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
          onClick={() => onDemoClick('chef_equipe')}
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

        <div className="pt-2 border-t border-sable/50 space-y-1.5">
          <p className="text-[10px] text-foret/60 font-bold uppercase tracking-wider text-center">
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
              className="py-1.5 px-1 bg-craie hover:bg-sable/40 active:scale-95 border border-sable/70 rounded-lg text-center text-foret text-[11px] font-bold transition-all cursor-pointer truncate"
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
              className="py-1.5 px-1 bg-craie hover:bg-sable/40 active:scale-95 border border-sable/70 rounded-lg text-center text-foret text-[11px] font-bold transition-all cursor-pointer truncate"
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
              className="py-1.5 px-1 bg-craie hover:bg-sable/40 active:scale-95 border border-sable/70 rounded-lg text-center text-foret text-[11px] font-bold transition-all cursor-pointer truncate"
            >
              Antoine P.
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
