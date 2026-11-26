import React from 'react';
import { Check, Plus, ShieldCheck } from 'lucide-react';
import type { ChantierStatut, Profile } from '../../types/database';

interface ChantierSupervisorPanelProps {
  statut: ChantierStatut;
  targetDate: string;
  allProfiles: Profile[];
  assignedWorkerIdsForDate: string[];
  onStatutChange: (statut: ChantierStatut) => void;
  onDateChange: (dateStr: string) => void;
  onToggleWorker: (workerId: string) => void;
}

export const ChantierSupervisorPanel: React.FC<ChantierSupervisorPanelProps> = ({
  statut,
  targetDate,
  allProfiles,
  assignedWorkerIdsForDate,
  onStatutChange,
  onDateChange,
  onToggleWorker,
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
        <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block">Statut du chantier</label>
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

      {/* Affectation des ouvriers */}
      <div className="space-y-2 pt-2 border-t border-sable/50 dark:border-[#2A3F3C]">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foret/80 dark:text-[#B8C7C2] block">
            Affecter les équipiers au :
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="min-h-[48px] text-xs font-bold text-foret dark:text-[#EDF2F0] bg-craie dark:bg-[#1E2E2C] rounded-xl px-2.5 py-2 border border-sable dark:border-[#304744] cursor-pointer"
          />
        </div>

        <p className="text-[11px] text-sauge dark:text-[#9BB89B]">
          Cochez les équipiers qui doivent intervenir sur ce chantier à cette date :
        </p>

        <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
          {allProfiles.map((p) => {
            const isAssigned = assignedWorkerIdsForDate.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggleWorker(p.id)}
                className={`w-full min-h-[48px] p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer border ${
                  isAssigned
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-200'
                    : 'bg-craie border-sable/70 text-foret/70 hover:bg-sable/30 dark:bg-[#1E2E2C] dark:border-[#304744] dark:text-[#B8C7C2] dark:hover:bg-[#263A37]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isAssigned
                        ? 'bg-emerald-600 text-white'
                        : 'bg-sable text-foret dark:bg-[#263A37] dark:text-[#D5E6DC]'
                    }`}
                  >
                    {p.prenom.charAt(0)}
                  </div>
                  <span>
                    {p.prenom} {p.nom} ({p.role === 'chef_equipe' ? 'Chef' : 'Ouvrier'})
                  </span>
                </div>

                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                    isAssigned
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-sable text-transparent dark:bg-[#172322] dark:border-[#354F4C]'
                  }`}
                >
                  {isAssigned ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4 text-foret/30 dark:text-[#8FA5A0]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
