import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';
import type { Affectation, Chantier, Profile } from '../../types/database';
import type { BatchAffectationPayload } from '../../lib/chantiersService';
import {
  DEFAULT_WORKDAYS,
  computePeriodDiff,
  expandDateRange,
  getDefaultPeriodForChantier,
  type ApplyPeriodMode,
} from '../../lib/affectationsUtils';
import { AffectationPeriodTab } from './AffectationPeriodTab';
import { AffectationDailyTab } from './AffectationDailyTab';

export type AffectationViewTab = 'period' | 'daily';

export interface ChantierAffectationManagerProps {
  chantier: Chantier;
  allChantiers: Chantier[];
  profiles: Profile[];
  allAffectations: Affectation[];
  activeDate: string;
  onChangeActiveDate: (dateStr: string) => void;
  onToggleWorker: (workerId: string) => void | Promise<void>;
  onApplyBatch: (payload: BatchAffectationPayload) => Promise<boolean>;
}

export const ChantierAffectationManager: React.FC<ChantierAffectationManagerProps> = ({
  chantier,
  allChantiers,
  profiles,
  allAffectations,
  activeDate,
  onChangeActiveDate,
  onToggleWorker,
  onApplyBatch,
}) => {
  const defaultPeriod = useMemo(() => getDefaultPeriodForChantier(chantier), [chantier]);

  const [activeTab, setActiveTab] = useState<AffectationViewTab>('period');
  const [startDate, setStartDate] = useState<string>(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState<string>(defaultPeriod.endDate);
  const [activeWeekdays, setActiveWeekdays] = useState<number[]>([...DEFAULT_WORKDAYS]);
  const [applyMode, setApplyMode] = useState<ApplyPeriodMode>('add');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { dates: periodDates, truncated } = useMemo(
    () => expandDateRange(startDate, endDate, activeWeekdays),
    [startDate, endDate, activeWeekdays]
  );

  const diff = useMemo(
    () =>
      computePeriodDiff({
        chantierId: chantier.id,
        dates: periodDates,
        selectedWorkerIds,
        mode: applyMode,
        existingAffectations: allAffectations,
      }),
    [chantier.id, periodDates, selectedWorkerIds, applyMode, allAffectations]
  );

  const handleApplyPresetRange = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    if (!nextStart) return;
    if (activeDate < nextStart || activeDate > nextEnd) {
      const nextDates = expandDateRange(nextStart, nextEnd, activeWeekdays).dates;
      onChangeActiveDate(nextDates[0] ?? nextStart);
    }
  };

  const handleToggleWeekday = (day: number) => {
    setActiveWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleChangeApplyMode = (nextMode: ApplyPeriodMode) => {
    setApplyMode(nextMode);
    if (nextMode === 'replace' && selectedWorkerIds.length === 0 && periodDates.length > 0) {
      const datesSet = new Set(periodDates);
      const existingWorkerIds = Array.from(
        new Set(
          allAffectations
            .filter((a) => a.chantier_id === chantier.id && datesSet.has(a.date_intervention))
            .map((a) => a.profile_id)
        )
      );
      setSelectedWorkerIds(existingWorkerIds);
    }
  };

  const handleToggleWorkerSelection = (profileId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedWorkerIds.length === profiles.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(profiles.map((p) => p.id));
    }
  };

  const handleSubmitPeriod = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ok = await onApplyBatch(diff);
      if (ok && periodDates.length > 0 && !periodDates.includes(activeDate)) {
        onChangeActiveDate(periodDates[0]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPreviousDay = async (prevDateStr: string) => {
    if (isSubmitting) return;
    const prevWorkerIds = Array.from(
      new Set(
        allAffectations
          .filter((a) => a.chantier_id === chantier.id && a.date_intervention === prevDateStr)
          .map((a) => a.profile_id)
      )
    );
    const copyDiff = computePeriodDiff({
      chantierId: chantier.id,
      dates: [activeDate],
      selectedWorkerIds: prevWorkerIds,
      mode: 'replace',
      existingAffectations: allAffectations,
    });
    setIsSubmitting(true);
    try {
      await onApplyBatch(copyDiff);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Sélecteur Par période | Jour par jour */}
      <div className="bg-sable/55 dark:bg-[#1E2E2C] p-1 rounded-2xl border border-sable/60 dark:border-[#304744] grid grid-cols-2 gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('period')}
          className={`min-h-[48px] px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
            activeTab === 'period'
              ? 'bg-white text-foret shadow-xs dark:bg-[#2A423F] dark:text-[#EDF2F0]'
              : 'text-foret/70 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0]'
          }`}
        >
          <CalendarRange className="w-4 h-4 text-terracotta dark:text-[#E38D69]" />
          <span>Par période</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`min-h-[48px] px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
            activeTab === 'daily'
              ? 'bg-white text-foret shadow-xs dark:bg-[#2A423F] dark:text-[#EDF2F0]'
              : 'text-foret/70 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0]'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>Jour par jour</span>
        </button>
      </div>

      {activeTab === 'period' ? (
        <AffectationPeriodTab
          chantier={chantier}
          allChantiers={allChantiers}
          profiles={profiles}
          allAffectations={allAffectations}
          startDate={startDate}
          endDate={endDate}
          activeWeekdays={activeWeekdays}
          periodDates={periodDates}
          truncated={truncated}
          applyMode={applyMode}
          selectedWorkerIds={selectedWorkerIds}
          diff={diff}
          isSubmitting={isSubmitting}
          onChangeStartDate={(val) => {
            setStartDate(val);
            if (endDate && val > endDate) setEndDate(val);
          }}
          onChangeEndDate={setEndDate}
          onApplyPresetRange={handleApplyPresetRange}
          onToggleWeekday={handleToggleWeekday}
          onChangeApplyMode={handleChangeApplyMode}
          onToggleWorkerSelection={handleToggleWorkerSelection}
          onToggleSelectAll={handleToggleSelectAll}
          onSubmitPeriod={handleSubmitPeriod}
        />
      ) : (
        <AffectationDailyTab
          chantier={chantier}
          allChantiers={allChantiers}
          profiles={profiles}
          allAffectations={allAffectations}
          periodDates={periodDates}
          activeDate={activeDate}
          isSubmitting={isSubmitting}
          onChangeActiveDate={onChangeActiveDate}
          onToggleWorker={onToggleWorker}
          onCopyPreviousDay={(prevDateStr) => void handleCopyPreviousDay(prevDateStr)}
        />
      )}
    </div>
  );
};
