import React from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Pencil,
} from 'lucide-react';
import type { PointageLocal } from '../../types/database';
import { formatHours } from '../../lib/hours';
import { formatFrenchShortDate } from '../../lib/dates';

interface PointagesHistoryListProps {
  sortedPeriodDeclarations: PointageLocal[];
  chantierMap: Map<string, string>;
  isHistoryExpanded: boolean;
  onToggleExpand: () => void;
  onSelectDate: (dateStr: string) => void;
  onOpenSaisie: (dateStr?: string) => void;
}

export const PointagesHistoryList: React.FC<PointagesHistoryListProps> = ({
  sortedPeriodDeclarations,
  chantierMap,
  isHistoryExpanded,
  onToggleExpand,
  onSelectDate,
  onOpenSaisie,
}) => {
  const visibleDeclarations = isHistoryExpanded
    ? sortedPeriodDeclarations
    : sortedPeriodDeclarations.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-foret uppercase tracking-wider">
            Détail des déclarations
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable/50 text-foret">
            {sortedPeriodDeclarations.length}
          </span>
        </div>

        {sortedPeriodDeclarations.length > 3 && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs font-bold text-foret/70 hover:text-foret flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{isHistoryExpanded ? 'Réduire' : 'Afficher tout'}</span>
            {isHistoryExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {sortedPeriodDeclarations.length === 0 ? (
        <div className="p-6 bg-craie rounded-2xl border border-sable/60 text-center text-xs text-foret/60 space-y-1">
          <Calendar className="w-5 h-5 mx-auto text-sauge/60" />
          <p className="font-medium">Aucune déclaration trouvée pour cette période.</p>
          <p className="text-[11px] text-sauge">
            Sélectionnez une date ci-dessus ou cliquez sur « + Saisir des heures ».
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleDeclarations.map((pt) => {
            const tot = Number(pt.heures_totales) || 0;
            const sup = Number(pt.heures_sup) || 0;
            const pause = Number(pt.temps_pause) || 0;
            const chantierName = pt.chantier_id
              ? chantierMap.get(pt.chantier_id) || 'Chantier du jour'
              : 'Chantier non spécifié';

            const dateDisplay = formatFrenchShortDate(pt.date);

            return (
              <div
                key={pt.id}
                onClick={() => {
                  onSelectDate(pt.date);
                  onOpenSaisie(pt.date);
                }}
                className="p-3.5 bg-craie hover:bg-white rounded-2xl border border-sable/70 hover:border-sauge transition-all cursor-pointer shadow-2xs hover:shadow-soft flex items-center justify-between gap-3 active:scale-[0.99] group"
              >
                {/* Côté gauche : Date et nom du chantier */}
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold text-foret block truncate">{dateDisplay}</span>
                  <span className="text-[11px] text-sauge font-medium block truncate">
                    {chantierName}
                  </span>
                  {pause > 0 && (
                    <span className="text-[10px] text-foret/60 font-medium block">
                      Temps de pause : {formatHours(pause)}
                    </span>
                  )}
                </div>

                {/* Côté droit : Heures travaillées, badge sup et synchro */}
                <div className="flex items-center gap-2.5 shrink-0 text-right">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-sable shadow-2xs">
                      <span className="text-xs font-extrabold text-foret">{formatHours(tot)}</span>
                      {sup > 0 && (
                        <span className="text-[10px] font-bold text-terracotta">
                          (dont {formatHours(sup)} sup)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[10px] font-medium">
                      {pt.synced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Synchronisé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <CloudUpload className="w-3 h-3 text-amber-600 animate-pulse" />
                          En attente
                        </span>
                      )}
                    </div>
                  </div>

                  <Pencil className="w-4 h-4 text-sauge/60 group-hover:text-foret transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
