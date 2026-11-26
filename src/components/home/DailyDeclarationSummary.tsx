import React from 'react';
import { AlertCircle, CheckCircle2, Clock, CloudUpload } from 'lucide-react';
import type { PointageLocal } from '../../types/database';
import { calculateNormalHours, formatHours } from '../../lib/hours';

interface DailyDeclarationSummaryProps {
  todayPointage: PointageLocal | null;
}

export const DailyDeclarationSummary: React.FC<DailyDeclarationSummaryProps> = ({
  todayPointage,
}) => {
  const total = todayPointage ? Number(todayPointage.heures_totales) || 0 : 0;
  const sup = todayPointage ? Number(todayPointage.heures_sup) || 0 : 0;
  const pause = todayPointage ? Number(todayPointage.temps_pause) || 0 : 0;
  const normal = calculateNormalHours(total, sup);

  return (
    <section className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-foret" />
          Ma déclaration du jour
        </h2>
        {todayPointage && (
          <span className="text-xs text-foret/60">
            {todayPointage.updated_at
              ? `Màj à ${new Date(todayPointage.updated_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Aujourd’hui'}
          </span>
        )}
      </div>

      {!todayPointage ? (
        <div className="text-center py-6 text-xs text-foret/50 space-y-1">
          <AlertCircle className="w-6 h-6 mx-auto text-sauge/60" />
          <p>Aucune heure enregistrée pour cette date.</p>
          <p className="text-[11px] text-sauge">
            Cliquez sur « + Saisir des heures » pour déclarer vos heures travaillées.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-craie rounded-2xl border border-sable/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-sauge font-bold uppercase block">
                Heures totales déclarées
              </span>
              <span className="text-xl font-black text-foret">{formatHours(total)}</span>
              <span className="text-[11px] text-sauge block">
                (dont {formatHours(sup)} supplémentaires)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-sauge font-bold uppercase block">
                Statut synchro
              </span>
              {todayPointage.synced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Synchronisé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                  <CloudUpload className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  En attente de réseau
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sable/40 text-xs">
            <div>
              <span className="text-[10px] text-sauge font-medium">Heures normales :</span>
              <p className="font-bold text-foret">{formatHours(normal)}</p>
            </div>
            <div>
              <span className="text-[10px] text-sauge font-medium">Dont heures sup :</span>
              <p className="font-bold text-terracotta">{formatHours(sup)}</p>
            </div>
            <div>
              <span className="text-[10px] text-sauge font-medium">Temps de pause :</span>
              <p className="font-bold text-foret">{formatHours(pause)}</p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-sable/50 text-[11px] text-foret font-medium text-center shadow-2xs">
            💡 Détail du jour :{' '}
            <span className="font-bold text-emerald-800">{formatHours(normal)}</span> normales +{' '}
            <span className="font-bold text-terracotta">{formatHours(sup)}</span> sup ={' '}
            <span className="font-extrabold text-foret">{formatHours(total)}</span> au total
          </div>
        </div>
      )}
    </section>
  );
};
