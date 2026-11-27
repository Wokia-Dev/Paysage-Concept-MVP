import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, getTodayDateString } from '../lib/db';
import { syncEngine } from '../lib/sync';
import {
  formatFrenchMonthYear,
  formatFrenchWeekdayDate,
  formatISODate,
  getWeekMonday,
  parseMiddayUTC,
} from '../lib/dates';
import {
  generateMonthGridDays,
  generateWeekDays,
  getMissionsForDate as computeMissionsForDate,
  getRelativeWeekLabel,
  type DayItem,
  type MonthGridDay,
  type PlanningMission,
  type ViewMode,
} from '../lib/planningUtils';
import type { Affectation, Chantier, Profile } from '../types/database';
import { isSupervisorRole } from '../lib/formatters';

export type { ViewMode, DayItem, MonthGridDay, PlanningMission };

export function usePlanningData(profile: Profile | null) {
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString(0));
  const [weekAnchorDate, setWeekAnchorDate] = useState<string>(() => getTodayDateString(0));
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [contactMember, setContactMember] = useState<Profile | null>(null);
  const [supervisorFilter, setSupervisorFilter] = useState<string>('mine');

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadLocalPlanning = useCallback(async () => {
    try {
      const [allChantiers, allAffectations, allProfiles] = await Promise.all([
        db.chantiers.toArray(),
        db.affectations.toArray(),
        db.profiles.toArray(),
      ]);
      setChantiers(allChantiers);
      setAffectations(allAffectations);
      setProfiles(allProfiles);
    } catch (err) {
      console.error('Erreur chargement planning:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) await loadLocalPlanning();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await syncEngine.pullRemoteData();
      }
    };
    void init();

    const unsub = syncEngine.subscribe(() => {
      if (isMounted) void loadLocalPlanning();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [loadLocalPlanning]);

  const targetFilterProfileId = useMemo(() => {
    if (!profile) return null;
    if (!isSupervisorRole(profile.role)) return profile.id;
    if (supervisorFilter === 'mine') return profile.id;
    if (supervisorFilter === 'all') return null;
    return supervisorFilter;
  }, [profile, supervisorFilter]);

  const syncMonthWithDate = useCallback((dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return;
    const today = new Date();
    const diffMonths = (y - today.getFullYear()) * 12 + (m - 1 - today.getMonth());
    setMonthOffset(diffMonths);
  }, []);

  const handleSelectDate = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      setWeekAnchorDate(dateStr);
      syncMonthWithDate(dateStr);
    },
    [syncMonthWithDate]
  );

  const handleJumpToday = useCallback(() => {
    const today = getTodayDateString(0);
    setSelectedDate(today);
    setWeekAnchorDate(today);
    setMonthOffset(0);
  }, []);

  const weekAnchorDateObj = useMemo(() => parseMiddayUTC(weekAnchorDate), [weekAnchorDate]);

  const currentWeekMonday = useMemo(
    () => getWeekMonday(weekAnchorDateObj),
    [weekAnchorDateObj]
  );

  const handlePrevWeek = useCallback(() => {
    const prev = new Date(weekAnchorDateObj);
    prev.setUTCDate(prev.getUTCDate() - 7);
    const newAnchorStr = formatISODate(prev);
    setWeekAnchorDate(newAnchorStr);
  }, [weekAnchorDateObj]);

  const handleNextWeek = useCallback(() => {
    const next = new Date(weekAnchorDateObj);
    next.setUTCDate(next.getUTCDate() + 7);
    const newAnchorStr = formatISODate(next);
    setWeekAnchorDate(newAnchorStr);
  }, [weekAnchorDateObj]);

  const weekLabel = useMemo(
    () => getRelativeWeekLabel(currentWeekMonday),
    [currentWeekMonday]
  );

  const weekDays: DayItem[] = useMemo(
    () => generateWeekDays(currentWeekMonday),
    [currentWeekMonday]
  );

  const getMissionsForDate = useCallback(
    (dateStr: string) =>
      computeMissionsForDate({
        dateStr,
        affectations,
        chantiers,
        profiles,
        currentUserId: profile?.id ?? null,
        targetFilterProfileId,
      }),
    [affectations, chantiers, profiles, profile?.id, targetFilterProfileId]
  );

  const currentDayMissions = useMemo(
    () => getMissionsForDate(selectedDate),
    [selectedDate, getMissionsForDate]
  );

  const selectedDayLabel = useMemo(
    () => formatFrenchWeekdayDate(selectedDate),
    [selectedDate]
  );

  const currentMonthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const currentMonthLabel = useMemo(
    () => formatFrenchMonthYear(currentMonthDate, undefined),
    [currentMonthDate]
  );

  const monthGridDays: MonthGridDay[] = useMemo(
    () =>
      generateMonthGridDays({
        currentMonthDate,
        selectedDate,
        getMissions: getMissionsForDate,
      }),
    [currentMonthDate, getMissionsForDate, selectedDate]
  );

  return {
    selectedDate,
    weekAnchorDate,
    monthOffset,
    setMonthOffset,
    viewMode,
    setViewMode,
    contactMember,
    setContactMember,
    supervisorFilter,
    setSupervisorFilter,
    profiles,
    targetFilterProfileId,
    weekLabel,
    weekDays,
    currentDayMissions,
    selectedDayLabel,
    currentMonthLabel,
    monthGridDays,
    syncMonthWithDate,
    handleSelectDate,
    handleJumpToday,
    handlePrevWeek,
    handleNextWeek,
    getMissionsForDate,
  };
}
