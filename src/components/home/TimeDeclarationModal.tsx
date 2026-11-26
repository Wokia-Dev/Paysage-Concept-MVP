import React from 'react';
import { AlertCircle, Clock, Minus, Plus, Save, Sparkles, X } from 'lucide-react';
import type { PointageLocal } from '../../types/database';
import { calculateNormalHours, formatHours } from '../../lib/hours';
import { formatFrenchWeekdayDate } from '../../lib/dates';
import { TimeRangeField } from './TimeRangeField';
import { TimeOvertimeAccordion } from './TimeOvertimeAccordion';

interface TimeDeclarationModalProps {
  selectedDateStr: string;
  todayPointage: PointageLocal | null;
  dailyTarget: number;
  heureDebut: string;
  heureFin: string;
  tempsPause: number;
  heuresSup: number;
  heuresTotales: number;
  calculatedAmplitude: number;
  isSupManuallyEdited: boolean;
  showAdvancedDetails: boolean;
  validationError: string | null;
  isSubmitting: boolean;
  lastUsedTimeRange: { heureDebut: string; heureFin: string } | null;
  onClose: () => void;
  onToggleAdvanced: () => void;
  onDebutChange: (val: string) => void;
  onFinChange: (val: string) => void;
  onPauseChange: (val: number) => void;
  onSupChange: (val: number) => void;
  onRealignSup: () => void;
  onApplyPresetRange: (debut: string, fin: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
}

const PAUSE_PRESETS = [
  { label: 'Sans pause', val: 0 },
  { label: '15 min', val: 0.25 },
  { label: '30 min', val: 0.5 },
  { label: '45 min', val: 0.75 },
  { label: '1h00', val: 1 },
];

export const TimeDeclarationModal: React.FC<TimeDeclarationModalProps> = ({
  selectedDateStr,
  todayPointage,
  dailyTarget,
  heureDebut,
  heureFin,
  tempsPause,
  heuresSup,
  heuresTotales,
  calculatedAmplitude,
  isSupManuallyEdited,
  showAdvancedDetails,
  validationError,
  isSubmitting,
  lastUsedTimeRange,
  onClose,
  onToggleAdvanced,
  onDebutChange,
  onFinChange,
  onPauseChange,
  onSupChange,
  onRealignSup,
  onApplyPresetRange,
  onSubmit,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foret/70 backdrop-blur-xs p-0 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-t-3xl border-t border-sable w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar p-5 space-y-4 animate-in slide-in-from-bottom duration-300 pb-[calc(env(safe-area-inset-bottom)+2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-hours-title"
      >
        <div className="w-12 h-1.5 bg-sable rounded-full mx-auto" />

        <div className="flex items-start justify-between border-b border-sable/50 pb-3">
          <div>
            <h3
              id="modal-hours-title"
              className="text-base font-extrabold text-foret flex items-center gap-2"
            >
              <Clock className="w-5 h-5 text-terracotta" />
              <span>{todayPointage ? 'Modifier mes heures' : 'Déclaration des heures'}</span>
            </h3>
            <p className="text-xs text-sauge capitalize font-semibold mt-0.5">
              {formatFrenchWeekdayDate(selectedDateStr)}
            </p>
            <p className="text-[11px] text-foret/60 mt-0.5">
              Ajustez vos compteurs avec les touches tactiles grand format
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-foret/60 hover:text-foret hover:bg-sable/30 cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {lastUsedTimeRange && (
            <div className="flex items-center justify-between p-2.5 bg-sable/30 rounded-2xl border border-sable/70 text-xs">
              <div className="flex items-center gap-1.5 text-foret font-semibold">
                <Sparkles className="w-4 h-4 text-terracotta shrink-0" />
                <span>
                  Horaires habituels ({lastUsedTimeRange.heureDebut.replace(':', 'h')} -{' '}
                  {lastUsedTimeRange.heureFin.replace(':', 'h')})
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onApplyPresetRange(lastUsedTimeRange.heureDebut, lastUsedTimeRange.heureFin)
                }
                className="min-h-[48px] px-3.5 py-2 rounded-xl bg-foret text-white font-bold text-xs hover:bg-foret/90 cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                Appliquer
              </button>
            </div>
          )}

          <TimeRangeField
            inputId="input-heure-arrivee"
            label="Heure d'arrivée :"
            shortLabel="Arrivée"
            value={heureDebut}
            fallbackTime="08:00"
            presets={['07:00', '07:30', '08:00', '08:30']}
            decreaseAriaLabel="Diminuer heure d'arrivée"
            increaseAriaLabel="Augmenter heure d'arrivée"
            inputAriaLabel="Choisir l'heure d'arrivée"
            onChange={onDebutChange}
          />

          <TimeRangeField
            inputId="input-heure-depart"
            label="Heure de départ :"
            shortLabel="Départ"
            value={heureFin}
            fallbackTime="17:00"
            presets={['16:30', '17:00', '17:30', '18:00']}
            decreaseAriaLabel="Diminuer heure de départ"
            increaseAriaLabel="Augmenter heure de départ"
            inputAriaLabel="Choisir l'heure de départ"
            onChange={onFinChange}
          />

          {/* Temps de pause */}
          <div className="bg-craie p-3 rounded-2xl border border-sable/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foret">Temps de pause :</span>
                <span className="text-xs font-black text-foret bg-white px-2 py-0.5 rounded-lg border border-sable shadow-2xs">
                  {tempsPause === 0 ? 'Sans pause' : formatHours(tempsPause)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onPauseChange(tempsPause - 0.25)}
                  className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                  aria-label="Diminuer pause"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onPauseChange(tempsPause + 0.25)}
                  className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                  aria-label="Augmenter pause"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {PAUSE_PRESETS.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onPauseChange(p.val)}
                  className={`min-h-[48px] px-3 font-bold rounded-xl border transition-colors cursor-pointer text-xs ${
                    tempsPause === p.val
                      ? 'bg-foret text-white border-foret shadow-xs'
                      : 'bg-white text-foret/80 border-sable hover:bg-sable/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Carte de résultat principale */}
          <div className="bg-gradient-to-br from-foret/10 via-sauge/15 to-craie rounded-2xl p-4 border-2 border-foret/20 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-foret flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Heures totales travaillées (heures sup incluses) :
              </span>
              {heuresTotales > 0 && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-foret text-white shadow-2xs">
                  {formatHours(heuresTotales)}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-3xl font-black text-foret tracking-tight">
                  {heuresTotales > 0 ? formatHours(heuresTotales) : '--:--'}
                </span>
                <p className="text-[11px] text-foret/70 font-medium mt-0.5">
                  Durée nette calculée (pause déduite)
                </p>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-white/90 px-2.5 py-1 rounded-xl border border-foret/15 text-xs shadow-2xs">
                  <span className="text-xs font-bold text-emerald-800">
                    {formatHours(calculateNormalHours(heuresTotales, heuresSup))}
                  </span>
                  <span className="text-[10px] text-sauge font-semibold">normales</span>
                </div>
                <div>
                  <span
                    className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-lg border ${
                      heuresSup > 0
                        ? 'bg-terracotta/15 text-terracotta border-terracotta/30'
                        : 'bg-white/60 text-foret/50 border-sable/60'
                    }`}
                  >
                    {heuresSup > 0 ? `+${formatHours(heuresSup)} sup` : '0h sup'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <TimeOvertimeAccordion
            heureDebut={heureDebut}
            heureFin={heureFin}
            tempsPause={tempsPause}
            heuresSup={heuresSup}
            heuresTotales={heuresTotales}
            dailyTarget={dailyTarget}
            calculatedAmplitude={calculatedAmplitude}
            isSupManuallyEdited={isSupManuallyEdited}
            showAdvancedDetails={showAdvancedDetails}
            onToggleAdvanced={onToggleAdvanced}
            onSupChange={onSupChange}
            onRealignSup={onRealignSup}
          />

          <button
            type="submit"
            disabled={
              isSubmitting || Boolean(validationError) || !heureDebut || !heureFin || heuresTotales <= 0
            }
            className="w-full min-h-[48px] h-14 bg-foret hover:bg-foret/90 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-foret/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Enregistrement en cours...'
                : todayPointage
                  ? 'Mettre à jour mes heures'
                  : 'Valider mes heures'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
