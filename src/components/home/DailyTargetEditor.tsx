import React from 'react';
import { Minus, Plus, Target } from 'lucide-react';
import { formatHours } from '../../lib/hours';

interface DailyTargetEditorProps {
  dailyTarget: number;
  onChangeTarget: (newTarget: number) => void;
  onClose: () => void;
}

export const DailyTargetEditor: React.FC<DailyTargetEditorProps> = ({
  dailyTarget,
  onChangeTarget,
  onClose,
}) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="p-4 bg-craie dark:bg-[#1E2E2C] rounded-2xl border border-sable dark:border-[#304744] text-xs text-foret dark:text-[#EDF2F0] space-y-3.5 animate-in fade-in duration-150 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <span className="font-bold flex items-center gap-1.5 text-foret dark:text-[#EDF2F0]">
          <Target className="w-4 h-4 text-terracotta dark:text-[#E38D69]" />
          Objectif journalier de référence :
        </span>
        <span className="font-extrabold text-terracotta dark:text-[#E38D69] text-sm">
          {formatHours(dailyTarget)} / jour
        </span>
      </div>
      <p className="text-[11px] text-foret/70 dark:text-[#B8C7C2] leading-tight">
        Toute heure saisie au-delà de cet objectif sera automatiquement pré-sélectionnée comme heure
        supplémentaire (dont sup).
      </p>

      {/* Présélections rapides (6h, 7h, 9h) */}
      <div>
        <div className="text-[11px] font-semibold text-foret/70 dark:text-[#B8C7C2] mb-1.5">
          Présélections rapides :
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[6, 7, 9].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeTarget(preset)}
              className={`min-h-[48px] px-3 font-extrabold rounded-xl border transition-all cursor-pointer text-sm flex items-center justify-center ${
                dailyTarget === preset
                  ? 'bg-foret text-white border-foret shadow-xs dark:bg-[#235852] dark:border-[#397A75]'
                  : 'bg-white text-foret/80 border-sable hover:bg-sable/50 active:scale-[0.98] dark:bg-[#172322] dark:text-[#B8C7C2] dark:border-[#304744] dark:hover:bg-[#263A37]'
              }`}
            >
              {formatHours(preset)}
            </button>
          ))}
        </div>
      </div>

      {/* Affiner l'objectif (steppers ± 30 min) */}
      <div>
        <div className="text-[11px] font-semibold text-foret/70 dark:text-[#B8C7C2] mb-1.5">
          Affiner l'objectif (± 30 min) :
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeTarget(dailyTarget - 0.5)}
            className="min-w-[48px] min-h-[48px] rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95 transition-all dark:bg-[#172322] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
            aria-label="Diminuer objectif"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 min-h-[48px] rounded-xl bg-white dark:bg-[#172322] border border-sable dark:border-[#304744] flex items-center justify-center shadow-2xs">
            <span className="font-black text-foret dark:text-[#EDF2F0] text-base tracking-tight">
              {formatHours(dailyTarget)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChangeTarget(dailyTarget + 0.5)}
            className="min-w-[48px] min-h-[48px] rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95 transition-all dark:bg-[#172322] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
            aria-label="Augmenter objectif"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bouton de validation */}
      <button
        type="button"
        onClick={onClose}
        className="w-full min-h-[48px] px-4 font-bold rounded-xl bg-foret text-white hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] dark:border dark:border-[#397A75]/55 transition-colors cursor-pointer flex items-center justify-center shadow-xs active:scale-[0.99]"
      >
        Valider l'objectif ({formatHours(dailyTarget)})
      </button>
    </div>
  );
};
