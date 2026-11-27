import React from 'react';
import { AlertTriangle, CalendarRange, Layers, Users } from 'lucide-react';
import type { Affectation, Chantier, Profile } from '../../types/database';
import {
  WEEKDAY_OPTIONS,
  computePeriodWorkerStats,
  getDefaultPeriodForChantier,
  getWeekPeriod,
  type ApplyPeriodMode,
  type PeriodDiffResult,
} from '../../lib/affectationsUtils';
import { AffectationWorkerRowContent } from './AffectationWorkerRowContent';

interface AffectationPeriodTabProps {
  chantier: Chantier;
  allChantiers: Chantier[];
  profiles: Profile[];
  allAffectations: Affectation[];
  startDate: string;
  endDate: string;
  activeWeekdays: number[];
  periodDates: string[];
  truncated: boolean;
  applyMode: ApplyPeriodMode;
  selectedWorkerIds: string[];
  diff: PeriodDiffResult;
  isSubmitting: boolean;
  onChangeStartDate: (val: string) => void;
  onChangeEndDate: (val: string) => void;
  onApplyPresetRange: (start: string, end: string) => void;
  onToggleWeekday: (day: number) => void;
  onChangeApplyMode: (mode: ApplyPeriodMode) => void;
  onToggleWorkerSelection: (profileId: string) => void;
  onToggleSelectAll: () => void;
  onSubmitPeriod: () => void;
}

export const AffectationPeriodTab: React.FC<AffectationPeriodTabProps> = ({
  chantier,
  allChantiers,
  profiles,
  allAffectations,
  startDate,
  endDate,
  activeWeekdays,
  periodDates,
  truncated,
  applyMode,
  selectedWorkerIds,
  diff,
  isSubmitting,
  onChangeStartDate,
  onChangeEndDate,
  onApplyPresetRange,
  onToggleWeekday,
  onChangeApplyMode,
  onToggleWorkerSelection,
  onToggleSelectAll,
  onSubmitPeriod,
}) => {
  const chantierRange = getDefaultPeriodForChantier(chantier);
  const thisWeek = getWeekPeriod(0);
  const nextWeek = getWeekPeriod(1);
  const hasChantierDates = Boolean(chantier.date_debut || chantier.date_fin);
  const allSelected = profiles.length > 0 && selectedWorkerIds.length === profiles.length;
  const hasChanges = diff.toAdd.length > 0 || diff.toRemoveIds.length > 0;

  const presetRanges = [
    ...(hasChantierDates ? [{ label: 'Durée chantier', range: chantierRange }] : []),
    { label: 'Cette semaine', range: thisWeek },
    { label: 'Sem. prochaine', range: nextWeek },
  ];

  return (
    <div className="space-y-3.5">
      {/* Raccourcis de période */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {presetRanges.map((preset) => {
          const isActive =
            startDate === preset.range.startDate && endDate === preset.range.endDate;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onApplyPresetRange(preset.range.startDate, preset.range.endDate)}
              className={`min-h-[48px] px-3 rounded-xl text-[11px] font-bold border transition-all shrink-0 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-foret text-sable border-foret dark:bg-[#235852] dark:text-[#EDF2F0] dark:border-[#397A75]'
                  : 'bg-craie text-foret/80 border-sable/80 hover:bg-sable/40 dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#304744] dark:hover:bg-[#263A37]'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Plage Du / Au */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-foret/80 dark:text-[#B8C7C2] mb-1">
            Du
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChangeStartDate(e.target.value)}
            className="w-full min-h-[48px] bg-craie dark:bg-[#1E2E2C] px-2.5 py-2 rounded-2xl border border-sable dark:border-[#304744] text-xs font-bold text-foret dark:text-[#EDF2F0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-foret/80 dark:text-[#B8C7C2] mb-1">
            Au
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onChangeEndDate(e.target.value)}
            className="w-full min-h-[48px] bg-craie dark:bg-[#1E2E2C] px-2.5 py-2 rounded-2xl border border-sable dark:border-[#304744] text-xs font-bold text-foret dark:text-[#EDF2F0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40"
          />
        </div>
      </div>

      {/* Pastilles jours de semaine */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-sauge dark:text-[#9BB89B] uppercase tracking-wider flex items-center gap-1">
            <CalendarRange className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69]" />
            Jours actifs
          </span>
          <span className="font-bold text-foret dark:text-[#EDF2F0]">
            {periodDates.length} jour{periodDates.length > 1 ? 's' : ''} ciblé
            {periodDates.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_OPTIONS.map((opt) => {
            const active = activeWeekdays.includes(opt.day);
            return (
              <button
                key={opt.day}
                type="button"
                onClick={() => onToggleWeekday(opt.day)}
                aria-pressed={active}
                title={opt.label}
                className={`min-h-[48px] rounded-xl text-xs font-extrabold border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
                  active
                    ? 'bg-foret text-sable border-foret shadow-2xs dark:bg-[#235852] dark:text-[#EDF2F0] dark:border-[#397A75]'
                    : 'bg-craie text-foret/50 border-sable/70 hover:text-foret dark:bg-[#1E2E2C] dark:text-[#8FA5A0] dark:border-[#304744] dark:hover:text-[#EDF2F0]'
                }`}
              >
                <span>{opt.short}</span>
                <span className="text-[9px] font-medium opacity-75">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {truncated && (
          <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Plage limitée aux 90 premiers jours calendaires.
          </p>
        )}
      </div>

      {/* Mode Ajouter vs Remplacer */}
      <div className="bg-craie dark:bg-[#1E2E2C] p-1 rounded-2xl border border-sable/70 dark:border-[#304744] grid grid-cols-2 gap-1 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => onChangeApplyMode('add')}
          className={`min-h-[48px] px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            applyMode === 'add'
              ? 'bg-white text-foret shadow-xs dark:bg-[#2A423F] dark:text-[#EDF2F0]'
              : 'text-foret/65 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Ajouter à l'existant</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeApplyMode('replace')}
          className={`min-h-[48px] px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            applyMode === 'replace'
              ? 'bg-white text-foret shadow-xs dark:bg-[#2A423F] dark:text-[#EDF2F0]'
              : 'text-foret/65 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Remplacer l'équipe</span>
        </button>
      </div>

      {/* Liste des équipiers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B]">
            Équipiers à affecter ({selectedWorkerIds.length}/{profiles.length})
          </span>
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="min-h-[48px] px-2.5 text-[11px] font-bold text-foret dark:text-[#9BB89B] hover:underline cursor-pointer"
          >
            {allSelected ? 'Tout décocher' : 'Tout cocher'}
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-0.5">
          {profiles.map((p) => {
            const isSelected = selectedWorkerIds.includes(p.id);
            const stats = computePeriodWorkerStats({
              chantierId: chantier.id,
              profileId: p.id,
              dates: periodDates,
              affectations: allAffectations,
              chantiers: allChantiers,
            });

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggleWorkerSelection(p.id)}
                className={`w-full min-h-[52px] flex items-center justify-between gap-2 p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-98 ${
                  isSelected
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-200'
                    : 'bg-craie/70 border-sable/70 text-foret hover:bg-craie dark:bg-[#1E2E2C] dark:border-[#304744] dark:text-[#EDF2F0] dark:hover:bg-[#263A37]'
                }`}
              >
                <AffectationWorkerRowContent
                  profile={p}
                  isSelected={isSelected}
                  coverageBadge={
                    stats.totalDays > 0 && stats.assignedCount > 0
                      ? {
                          label: `Déjà ${stats.assignedCount}/${stats.totalDays} j`,
                          isFull: stats.isFullyAssigned,
                        }
                      : undefined
                  }
                  conflicts={stats.otherChantiers}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Pied d'action avec aperçu du diff */}
      <div className="pt-1 space-y-2">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="text-foret/70 dark:text-[#B8C7C2] font-medium">Aperçu :</span>
          {hasChanges ? (
            <span className="font-bold text-foret dark:text-[#EDF2F0]">
              {diff.toAdd.length > 0 && (
                <span className="text-emerald-700 dark:text-emerald-400">
                  +{diff.toAdd.length} ajout{diff.toAdd.length > 1 ? 's' : ''}
                </span>
              )}
              {diff.toAdd.length > 0 && diff.toRemoveIds.length > 0 && ' · '}
              {diff.toRemoveIds.length > 0 && (
                <span className="text-terracotta dark:text-[#E38D69]">
                  -{diff.toRemoveIds.length} retrait{diff.toRemoveIds.length > 1 ? 's' : ''}
                </span>
              )}
            </span>
          ) : (
            <span className="text-foret/50 dark:text-[#8FA5A0] italic">
              {periodDates.length === 0
                ? 'Sélectionnez au moins un jour actif'
                : 'Aucune modification'}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!hasChanges || isSubmitting || periodDates.length === 0}
          onClick={onSubmitPeriod}
          className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] disabled:opacity-45 disabled:pointer-events-none text-white font-bold text-xs shadow-md shadow-foret/20 dark:shadow-none transition-all cursor-pointer active:scale-98"
        >
          {isSubmitting
            ? 'Application en cours...'
            : `Appliquer sur ${periodDates.length} jour${periodDates.length > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
};
