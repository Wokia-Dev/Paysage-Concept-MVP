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
    <section className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-foret dark:text-[#9BB89B]" />
          Ma déclaration du jour
        </h2>
        {todayPointage && (
          <span className="text-xs text-foret/60 dark:text-[#B8C7C2]">
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
        <div className="text-center py-6 text-xs text-foret/50 dark:text-[#B8C7C2] space-y-1">
          <AlertCircle className="w-6 h-6 mx-auto text-sauge/60 dark:text-[#9BB89B]/70" />
          <p>Aucune heure enregistrée pour cette date.</p>
          <p className="text-[11px] text-sauge dark:text-[#9BB89B]">
            Cliquez sur « + Saisir des heures » pour déclarer vos heures travaillées.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-craie dark:bg-[#1E2E2C] rounded-2xl border border-sable/60 dark:border-[#304744] space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-bold uppercase block">
                Heures totales déclarées
              </span>
              <span className="text-xl font-black text-foret dark:text-[#EDF2F0]">{formatHours(total)}</span>
              <span className="text-[11px] text-sauge dark:text-[#9BB89B] block">
                (dont {formatHours(sup)} supplémentaires)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-bold uppercase block">
                Statut synchro
              </span>
              {todayPointage.synced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Synchronisé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  <CloudUpload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  En attente de réseau
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sable/40 dark:border-[#304744] text-xs">
            <div>
              <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium">Heures normales :</span>
              <p className="font-bold text-foret dark:text-[#EDF2F0]">{formatHours(normal)}</p>
            </div>
            <div>
              <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium">Dont heures sup :</span>
              <p className="font-bold text-terracotta dark:text-[#E38D69]">{formatHours(sup)}</p>
            </div>
            <div>
              <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium">Temps de pause :</span>
              <p className="font-bold text-foret dark:text-[#EDF2F0]">{formatHours(pause)}</p>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-[#172322] rounded-xl border border-sable/50 dark:border-[#304744] text-[11px] text-foret dark:text-[#EDF2F0] font-medium text-center shadow-2xs">
            💡 Détail du jour :{' '}
            <span className="font-bold text-emerald-800 dark:text-emerald-300">{formatHours(normal)}</span> normales +{' '}
            <span className="font-bold text-terracotta dark:text-[#E38D69]">{formatHours(sup)}</span> sup ={' '}
            <span className="font-extrabold text-foret dark:text-[#EDF2F0]">{formatHours(total)}</span> au total
          </div>
        </div>
      )}
    </section>
  );
};
