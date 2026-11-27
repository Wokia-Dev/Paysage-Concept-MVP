import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Affectation, Chantier, ChantierStatut, Profile } from '../../types/database';
import type { BatchAffectationPayload } from '../../lib/chantiersService';
import { ChantierAffectationManager } from './ChantierAffectationManager';

interface ChantierSupervisorPanelProps {
  chantier: Chantier;
  allChantiers: Chantier[];
  statut: ChantierStatut;
  targetDate: string;
  allProfiles: Profile[];
  allAffectations: Affectation[];
  onStatutChange: (statut: ChantierStatut) => void;
  onDateChange: (dateStr: string) => void;
  onToggleWorker: (workerId: string) => void | Promise<void>;
  onApplyBatch: (payload: BatchAffectationPayload) => Promise<boolean>;
}

export const ChantierSupervisorPanel: React.FC<ChantierSupervisorPanelProps> = ({
  chantier,
  allChantiers,
  statut,
  targetDate,
  allProfiles,
  allAffectations,
  onStatutChange,
  onDateChange,
  onToggleWorker,
  onApplyBatch,
}) => {
  return (
    <div className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-4">
      <div className="flex items-center justify-between border-b border-sable/60 dark:border-[#2A3F3C] pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-foret dark:text-[#EDF2F0] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Pilotage Superviseur
        </span>
        <span className="text-[11px] text-sauge dark:text-[#9BB89B] font-medium">Chef d'équipe</span>
      </div>

      {/* Modification du statut du chantier */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block">
          Statut du chantier
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(['en_attente', 'en_cours', 'termine'] as ChantierStatut[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onStatutChange(st)}
              className={`min-h-[48px] py-2 px-1 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center ${
                statut === st
                  ? 'bg-foret text-sable shadow-xs dark:bg-[#235852] dark:text-[#EDF2F0]'
                  : 'bg-craie text-foret/70 border border-sable hover:bg-sable/40 dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#304744] dark:hover:bg-[#263A37]'
              }`}
            >
              {st === 'en_attente' && 'En attente'}
              {st === 'en_cours' && 'En cours'}
              {st === 'termine' && 'Terminé'}
            </button>
          ))}
        </div>
      </div>

      {/* Gestion des affectations (Période & Jour par jour) */}
      <div className="space-y-2.5 pt-2 border-t border-sable/50 dark:border-[#2A3F3C]">
        <span className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block">
          Affectation des équipiers
        </span>

        <ChantierAffectationManager
          key={chantier.id}
          chantier={chantier}
          allChantiers={allChantiers}
          profiles={allProfiles}
          allAffectations={allAffectations}
          activeDate={targetDate}
          onChangeActiveDate={onDateChange}
          onToggleWorker={onToggleWorker}
          onApplyBatch={onApplyBatch}
        />
      </div>
    </div>
  );
};
