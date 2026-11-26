import React from 'react';
import { Calendar, Check, UserCheck, X } from 'lucide-react';
import type { Affectation, Chantier, Profile } from '../../types/database';
import { getTodayDateString } from '../../lib/dates';

interface ChantierAssignModalProps {
  chantier: Chantier;
  profiles: Profile[];
  affectations: Affectation[];
  assignDate: string;
  onChangeDate: (dateStr: string) => void;
  onToggleWorker: (workerId: string) => void;
  onClose: () => void;
}

export const ChantierAssignModal: React.FC<ChantierAssignModalProps> = ({
  chantier,
  profiles,
  affectations,
  assignDate,
  onChangeDate,
  onToggleWorker,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-sable pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foret">Gérer les affectations</h2>
              <p className="text-xs text-foret/70 truncate max-w-[220px]">{chantier.nom_client}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center hover:bg-craie rounded-2xl text-foret/60 hover:text-foret cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteur de date d'intervention */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-foret flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-terracotta" />
            <span>Date d'intervention</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={assignDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-craie p-3 min-h-[48px] rounded-2xl border border-sable text-xs font-bold text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 flex-1"
            />
            <button
              type="button"
              onClick={() => onChangeDate(getTodayDateString(0))}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl text-xs font-bold bg-sable/50 text-foret hover:bg-sable border border-sable/80 transition-colors cursor-pointer"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* Liste des équipiers avec toggle */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sauge block">
            Équipe disponible ({profiles.length})
          </span>

          <div className="space-y-2">
            {profiles.map((p) => {
              const isAssigned = affectations.some(
                (a) =>
                  a.chantier_id === chantier.id &&
                  a.profile_id === p.id &&
                  a.date_intervention === assignDate
              );

              return (
                <div
                  key={p.id}
                  onClick={() => onToggleWorker(p.id)}
                  className={`min-h-[52px] flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-98 ${
                    isAssigned
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                      : 'bg-craie/70 border-sable/70 text-foret hover:bg-craie'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-xs ${
                        isAssigned ? 'bg-emerald-700 text-white' : 'bg-foret/10 text-foret'
                      }`}
                    >
                      {p.prenom.charAt(0)}
                      {p.nom.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">
                        {p.prenom} {p.nom}
                      </p>
                      <span className="text-[11px] text-foret/60 capitalize">
                        {p.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
                      isAssigned
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'border-sable bg-white text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-sable">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] py-3 rounded-2xl bg-foret text-sable font-bold text-xs shadow-sm hover:bg-foret/90 transition-all cursor-pointer"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
};
