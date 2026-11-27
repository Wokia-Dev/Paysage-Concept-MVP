import React, { useMemo } from 'react';
import { Calendar, Copy } from 'lucide-react';
import type { Affectation, Chantier, Profile } from '../../types/database';
import {
  computeDayWorkerConflicts,
  computePeriodDiff,
  getPreviousActiveDate,
} from '../../lib/affectationsUtils';
import {
  formatFrenchWeekdayDate,
  formatISODate,
  getTodayDateString,
  getWeekMonday,
  parseMiddayUTC,
} from '../../lib/dates';
import { AffectationWorkerRowContent } from './AffectationWorkerRowContent';

interface AffectationDailyTabProps {
  chantier: Chantier;
  allChantiers: Chantier[];
  profiles: Profile[];
  allAffectations: Affectation[];
  periodDates: string[];
  activeDate: string;
  isSubmitting: boolean;
  onChangeActiveDate: (dateStr: string) => void;
  onToggleWorker: (workerId: string) => void;
  onCopyPreviousDay: (prevDateStr: string, workerCount: number) => void;
}

export const AffectationDailyTab: React.FC<AffectationDailyTabProps> = ({
  chantier,
  allChantiers,
  profiles,
  allAffectations,
  periodDates,
  activeDate,
  isSubmitting,
  onChangeActiveDate,
  onToggleWorker,
  onCopyPreviousDay,
}) => {
  const todayStr = getTodayDateString(0);

  const stripDates = useMemo(() => {
    if (periodDates.length > 0 && periodDates.includes(activeDate)) {
      return periodDates;
    }
    const monday = getWeekMonday(parseMiddayUTC(activeDate || todayStr));
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      week.push(formatISODate(d));
    }
    return week;
  }, [periodDates, activeDate, todayStr]);

  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const aff of allAffectations) {
      if (aff.chantier_id === chantier.id) {
        map.set(aff.date_intervention, (map.get(aff.date_intervention) ?? 0) + 1);
      }
    }
    return map;
  }, [allAffectations, chantier.id]);

  const assignedForActiveDate = useMemo(() => {
    return new Set(
      allAffectations
        .filter((a) => a.chantier_id === chantier.id && a.date_intervention === activeDate)
        .map((a) => a.profile_id)
    );
  }, [allAffectations, chantier.id, activeDate]);

  const prevDateStr = useMemo(
    () => getPreviousActiveDate(activeDate, periodDates),
    [activeDate, periodDates]
  );

  const prevWorkerIds = useMemo(() => {
    return Array.from(
      new Set(
        allAffectations
          .filter((a) => a.chantier_id === chantier.id && a.date_intervention === prevDateStr)
          .map((a) => a.profile_id)
      )
    );
  }, [allAffectations, chantier.id, prevDateStr]);

  const copyDiff = useMemo(
    () =>
      computePeriodDiff({
        chantierId: chantier.id,
        dates: [activeDate],
        selectedWorkerIds: prevWorkerIds,
        mode: 'replace',
        existingAffectations: allAffectations,
      }),
    [chantier.id, activeDate, prevWorkerIds, allAffectations]
  );

  const canCopyPrev =
    prevWorkerIds.length > 0 && (copyDiff.toAdd.length > 0 || copyDiff.toRemoveIds.length > 0);

  return (
    <div className="space-y-3.5">
      {/* Bandeau de sélection rapide jour par jour */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {stripDates.map((dStr) => {
          const dObj = parseMiddayUTC(dStr);
          const dayShort = new Intl.DateTimeFormat('fr-FR', {
            weekday: 'short',
            timeZone: 'UTC',
          })
            .format(dObj)
            .replace('.', '');
          const dayNum = dObj.getUTCDate();
          const count = countsByDate.get(dStr) ?? 0;
          const isSelected = dStr === activeDate;
          const isToday = dStr === todayStr;

          return (
            <button
              key={dStr}
              type="button"
              onClick={() => onChangeActiveDate(dStr)}
              className={`min-w-[56px] min-h-[58px] px-2 py-1.5 rounded-2xl border flex flex-col items-center justify-center gap-0.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-foret text-sable border-foret shadow-sm dark:bg-[#235852] dark:text-[#EDF2F0] dark:border-[#397A75]'
                  : isToday
                    ? 'bg-sable/40 text-foret border-terracotta/60 dark:bg-[#223532] dark:text-[#EDF2F0] dark:border-[#E38D69]/60'
                    : 'bg-craie text-foret/80 border-sable/70 hover:bg-sable/30 dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#304744] dark:hover:bg-[#263A37]'
              }`}
            >
              <span className="text-[10px] font-bold capitalize opacity-80">{dayShort}</span>
              <span className="text-xs font-extrabold leading-none">{dayNum}</span>
              <span
                className={`text-[9px] font-extrabold px-1.5 rounded-full leading-tight ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : count > 0
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200'
                      : 'bg-sable/50 text-foret/50 dark:bg-[#263A37] dark:text-[#8FA5A0]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sélecteur date précise + bouton Copier la veille */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-craie/70 dark:bg-[#1E2E2C] p-2.5 rounded-2xl border border-sable/70 dark:border-[#304744]">
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-foret dark:text-[#EDF2F0] truncate">
            {formatFrenchWeekdayDate(activeDate)}
          </p>
          <p className="text-[11px] text-sauge dark:text-[#9BB89B] font-semibold">
            {assignedForActiveDate.size} équipier{assignedForActiveDate.size > 1 ? 's' : ''} affecté
            {assignedForActiveDate.size > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="relative min-w-[48px] min-h-[48px] px-2.5 rounded-xl bg-white dark:bg-[#172322] border border-sable dark:border-[#354F4C] text-foret dark:text-[#EDF2F0] flex items-center justify-center cursor-pointer hover:bg-sable/30 dark:hover:bg-[#263A37]">
            <Calendar className="w-4 h-4 text-terracotta dark:text-[#E38D69]" />
            <input
              type="date"
              aria-label="Choisir une autre date"
              value={activeDate}
              onChange={(e) => e.target.value && onChangeActiveDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          <button
            type="button"
            disabled={!canCopyPrev || isSubmitting}
            onClick={() => onCopyPreviousDay(prevDateStr, prevWorkerIds.length)}
            className="min-h-[48px] px-3 rounded-xl bg-white dark:bg-[#172322] border border-sable dark:border-[#354F4C] text-xs font-bold text-foret dark:text-[#EDF2F0] hover:bg-sable/30 dark:hover:bg-[#263A37] disabled:opacity-45 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Copy className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69]" />
            <span>
              {prevWorkerIds.length > 0
                ? `Copier la veille (${prevWorkerIds.length})`
                : 'Copier la veille'}
            </span>
          </button>
        </div>
      </div>

      {/* Bascule unitaire par équipier */}
      <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-0.5">
        {profiles.map((p) => {
          const isAssigned = assignedForActiveDate.has(p.id);
          const conflicts = computeDayWorkerConflicts({
            chantierId: chantier.id,
            profileId: p.id,
            dateStr: activeDate,
            affectations: allAffectations,
            chantiers: allChantiers,
          });

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggleWorker(p.id)}
              className={`w-full min-h-[52px] flex items-center justify-between gap-2 p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-98 ${
                isAssigned
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-200'
                  : 'bg-craie/70 border-sable/70 text-foret hover:bg-craie dark:bg-[#1E2E2C] dark:border-[#304744] dark:text-[#EDF2F0] dark:hover:bg-[#263A37]'
              }`}
            >
              <AffectationWorkerRowContent
                profile={p}
                isSelected={isAssigned}
                showPlusWhenUnselected
                conflicts={conflicts}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
