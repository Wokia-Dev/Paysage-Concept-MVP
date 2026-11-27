import React from 'react';
import { UserCheck, X } from 'lucide-react';
import type { Affectation, Chantier, Profile } from '../../types/database';
import type { BatchAffectationPayload } from '../../lib/chantiersService';
import { ChantierAffectationManager } from './ChantierAffectationManager';

interface ChantierAssignModalProps {
  chantier: Chantier;
  allChantiers: Chantier[];
  profiles: Profile[];
  affectations: Affectation[];
  assignDate: string;
  onChangeDate: (dateStr: string) => void;
  onToggleWorker: (workerId: string) => void | Promise<void>;
  onApplyBatch: (payload: BatchAffectationPayload) => Promise<boolean>;
  onClose: () => void;
}

export const ChantierAssignModal: React.FC<ChantierAssignModalProps> = ({
  chantier,
  allChantiers,
  profiles,
  affectations,
  assignDate,
  onChangeDate,
  onToggleWorker,
  onApplyBatch,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#172322] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border-t sm:border border-transparent dark:border-[#2A3F3C] animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-sable dark:border-[#2A3F3C] pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-foret dark:text-[#EDF2F0]">
                Gérer les affectations
              </h2>
              <p className="text-xs text-foret/70 dark:text-[#B8C7C2] truncate max-w-[240px]">
                {chantier.nom_client}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center hover:bg-craie dark:hover:bg-[#263A37] rounded-2xl text-foret/60 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ChantierAffectationManager
          key={chantier.id}
          chantier={chantier}
          allChantiers={allChantiers}
          profiles={profiles}
          allAffectations={affectations}
          activeDate={assignDate}
          onChangeActiveDate={onChangeDate}
          onToggleWorker={onToggleWorker}
          onApplyBatch={onApplyBatch}
        />

        <div className="pt-2 border-t border-sable dark:border-[#2A3F3C]">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-craie hover:bg-sable/50 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] text-foret dark:text-[#EDF2F0] border border-sable dark:border-[#304744] font-bold text-xs transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
