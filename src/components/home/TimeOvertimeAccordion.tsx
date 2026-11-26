import React from 'react';
import { ChevronDown, Minus, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { calculateAutoOvertime, formatHours } from '../../lib/hours';

interface TimeOvertimeAccordionProps {
  heureDebut: string;
  heureFin: string;
  tempsPause: number;
  heuresSup: number;
  heuresTotales: number;
  dailyTarget: number;
  calculatedAmplitude: number;
  isSupManuallyEdited: boolean;
  showAdvancedDetails: boolean;
  onToggleAdvanced: () => void;
  onSupChange: (val: number) => void;
  onRealignSup: () => void;
}

export const TimeOvertimeAccordion: React.FC<TimeOvertimeAccordionProps> = ({
  heureDebut,
  heureFin,
  tempsPause,
  heuresSup,
  heuresTotales,
  dailyTarget,
  calculatedAmplitude,
  isSupManuallyEdited,
  showAdvancedDetails,
  onToggleAdvanced,
  onSupChange,
  onRealignSup,
}) => {
  return (
    <div className="border border-sable/80 dark:border-[#304744] rounded-2xl overflow-hidden bg-craie dark:bg-[#1E2E2C]">
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="w-full py-3 px-3.5 bg-craie hover:bg-sable/30 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] flex items-center justify-between text-xs font-bold text-foret dark:text-[#EDF2F0] transition-colors cursor-pointer min-h-[48px]"
        aria-expanded={showAdvancedDetails}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-foret/70 dark:text-[#9BB89B]" />
          <span>Ajuster les heures sup & détails</span>
          {isSupManuallyEdited && (
            <span className="bg-terracotta/15 text-terracotta dark:bg-terracotta/25 dark:text-[#F0A07E] text-[10px] px-2 py-0.5 rounded-full font-bold">
              {formatHours(heuresSup)} manuelles
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-foret/60 dark:text-[#B8C7C2] transition-transform duration-200 ${
            showAdvancedDetails ? 'rotate-180' : ''
          }`}
        />
      </button>

      {showAdvancedDetails && (
        <div className="p-3.5 pt-0 space-y-3.5 border-t border-sable/60 dark:border-[#304744] animate-in fade-in duration-150">
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="bg-white dark:bg-[#172322] rounded-xl p-2.5 border border-sable dark:border-[#304744] shadow-2xs">
              <span className="text-[10px] font-bold text-sauge dark:text-[#9BB89B] block">Amplitude totale</span>
              <span className="text-base font-extrabold text-foret dark:text-[#EDF2F0]">
                {heureDebut && heureFin ? formatHours(calculatedAmplitude) : '--:--'}
              </span>
            </div>
            <div className="bg-white dark:bg-[#172322] rounded-xl p-2.5 border border-sable dark:border-[#304744] shadow-2xs">
              <span className="text-[10px] font-bold text-sauge dark:text-[#9BB89B] block">Pause déduite</span>
              <span className="text-base font-extrabold text-foret dark:text-[#EDF2F0]">
                {tempsPause > 0 ? `-${formatHours(tempsPause)}` : '0h00'}
              </span>
            </div>
          </div>

          <div className="space-y-2 bg-white dark:bg-[#172322] p-3 rounded-xl border border-sable dark:border-[#304744]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foret dark:text-[#EDF2F0]">
                Dont heures supplémentaires (incluses) :
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSupChange(heuresSup - 0.25)}
                  className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-craie hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
                  aria-label="Diminuer heures sup"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onSupChange(heuresSup + 0.25)}
                  className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-craie hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
                  aria-label="Augmenter heures sup"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-craie dark:bg-[#1E2E2C] rounded-xl p-2.5 border border-sable/70 dark:border-[#304744]">
              <span className="text-xs font-bold text-sauge dark:text-[#9BB89B]">Montant retenu</span>
              <span className="text-lg font-black text-terracotta dark:text-[#E38D69] tracking-tight">
                {heuresSup === 0 ? '0h (Aucune)' : `+${formatHours(heuresSup)}`}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-sauge dark:text-[#9BB89B]">
              <span>
                Heures supplémentaires déjà incluses dans les {formatHours(heuresTotales)} totales
                (auto au-delà de {formatHours(dailyTarget)}).
              </span>
              {isSupManuallyEdited ? (
                <button
                  type="button"
                  onClick={onRealignSup}
                  className="text-terracotta dark:text-[#E38D69] hover:underline font-semibold cursor-pointer flex items-center gap-1 shrink-0 ml-1"
                  title="Rétablir la pré-sélection basée sur l'objectif"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>
                    Réaligner ({formatHours(calculateAutoOvertime(heuresTotales, dailyTarget))})
                  </span>
                </button>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold shrink-0 ml-1">(Calcul auto)</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0, 0.5, 1, 1.5, 2].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSupChange(val)}
                  className={`min-h-[48px] px-3 font-bold rounded-xl border transition-colors cursor-pointer text-xs ${
                    heuresSup === val
                      ? 'bg-foret text-white border-foret shadow-xs dark:bg-[#235852] dark:border-[#397A75]'
                      : 'bg-craie text-foret/80 border-sable hover:bg-sable/50 dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#304744] dark:hover:bg-[#263A37]'
                  }`}
                >
                  {val === 0 ? '0h (Aucune)' : `+${formatHours(val)}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
