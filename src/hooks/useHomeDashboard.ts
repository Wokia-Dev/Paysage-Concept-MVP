import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db, getTodayDateString } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { fetchChantierWeather, type WeatherInfo } from '../lib/weather';
import {
  aggregateTeamDailyStatus,
  calculateAmplitude,
  calculateAutoOvertime,
  calculateDurationFromRange,
  calculateNormalHours,
  decimalToTimeString,
  DEFAULT_PAUSE,
  getLastUsedTimeRange,
  getStoredDailyTarget,
  normalizeTimeString,
  setLastUsedTimeRange,
  setStoredDailyTarget,
  validateDailyHours,
  validateTimeRange,
  type WorkerDailyStatus,
} from '../lib/hours';
import type { Chantier, PointageLocal, Profile } from '../types/database';

export interface TeamSummaryMetrics {
  totalTeamHours: number;
  totalNormalHours: number;
  totalOvertime: number;
  totalPause: number;
  workersCount: number;
  submittedCount: number;
}

export function useHomeDashboard(profile: Profile | null) {
  const [allChantiers, setAllChantiers] = useState<Chantier[]>([]);
  const [assignedChantiers, setAssignedChantiers] = useState<Chantier[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [todayPointage, setTodayPointage] = useState<PointageLocal | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userAllPointages, setUserAllPointages] = useState<PointageLocal[]>([]);

  const todayStr = useMemo(() => getTodayDateString(0), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayDateString(0));

  const [dailyTarget, setDailyTarget] = useState<number>(() =>
    getStoredDailyTarget(profile?.id)
  );
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  const [heureDebut, setHeureDebut] = useState<string>('');
  const [heureFin, setHeureFin] = useState<string>('');
  const [tempsPause, setTempsPause] = useState<number>(DEFAULT_PAUSE);
  const [heuresSup, setHeuresSup] = useState<number>(0);
  const [isSupManuallyEdited, setIsSupManuallyEdited] = useState(false);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [lastUsedTimeRange, setLastUsedTimeRangeState] = useState<{
    heureDebut: string;
    heureFin: string;
  } | null>(() => getLastUsedTimeRange(profile?.id));
  const [prevProfileId, setPrevProfileId] = useState<string | undefined>(profile?.id);

  // Refs pour éviter le double chargement initial et préserver les saisies modales en cours
  const lastFormKeyRef = useRef<string | null>(null);
  const isModalOpenRef = useRef(false);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  if (profile?.id !== prevProfileId) {
    setPrevProfileId(profile?.id);
    setLastUsedTimeRangeState(getLastUsedTimeRange(profile?.id));
    setDailyTarget(getStoredDailyTarget(profile?.id));
    setSelectedChantier(null);
  }

  const calculatedAmplitude = useMemo(
    () => calculateAmplitude(heureDebut, heureFin),
    [heureDebut, heureFin]
  );

  const heuresTotales = useMemo(() => {
    if (!heureDebut || !heureFin) return 0;
    return calculateDurationFromRange(heureDebut, heureFin, tempsPause);
  }, [heureDebut, heureFin, tempsPause]);

  const [teamStatuses, setTeamStatuses] = useState<WorkerDailyStatus[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummaryMetrics>({
    totalTeamHours: 0,
    totalNormalHours: 0,
    totalOvertime: 0,
    totalPause: 0,
    workersCount: 0,
    submittedCount: 0,
  });

  const refreshData = useCallback(async () => {
    if (!profile) return;
    try {
      const currentTarget = getStoredDailyTarget(profile.id);
      setDailyTarget(currentTarget);

      const [chantiersData, myAffsData, existingPt, allProfilesData, allDayPts, myAllPointages] =
        await Promise.all([
          db.chantiers.toArray(),
          db.affectations
            .where({ profile_id: profile.id, date_intervention: selectedDateStr })
            .toArray(),
          db.pointages.where('[profile_id+date]').equals([profile.id, selectedDateStr]).first(),
          db.profiles.toArray(),
          db.pointages.where('date').equals(selectedDateStr).toArray(),
          db.pointages.where('profile_id').equals(profile.id).toArray(),
        ]);

      setAllChantiers(chantiersData);
      setUserAllPointages(myAllPointages);

      const myChantierIds = myAffsData.map((a) => a.chantier_id);
      const myChantiers = chantiersData.filter((c) => myChantierIds.includes(c.id));
      setAssignedChantiers(myChantiers);
      setTodayPointage(existingPt || null);

      if (existingPt?.chantier_id) {
        const matched = chantiersData.find((c) => c.id === existingPt.chantier_id);
        if (matched) setSelectedChantier(matched);
      } else if (profile.role === 'ouvrier') {
        setSelectedChantier((prev) =>
          prev && myChantiers.some((c) => c.id === prev.id) ? prev : myChantiers[0] || null
        );
      } else {
        const defaultCh = myChantiers[0] || chantiersData[0] || null;
        setSelectedChantier((prev) => prev || defaultCh);
      }

      // Pré-remplissage ou réinitialisation propre du formulaire selon la date sélectionnée
      const formKey = `${profile.id}:${selectedDateStr}`;
      const dateChanged = lastFormKeyRef.current !== formKey;
      if (dateChanged || !isModalOpenRef.current) {
        if (existingPt) {
          const deb = existingPt.heure_debut ? normalizeTimeString(existingPt.heure_debut) : '';
          const fin = existingPt.heure_fin ? normalizeTimeString(existingPt.heure_fin) : '';
          const tot = Number(existingPt.heures_totales) || 0;
          const pause = Number.isFinite(existingPt.temps_pause)
            ? Number(existingPt.temps_pause)
            : DEFAULT_PAUSE;
          const sup = Number(existingPt.heures_sup) || 0;

          if (deb && fin) {
            setHeureDebut(deb);
            setHeureFin(fin);
          } else if (tot > 0) {
            setHeureDebut('08:00');
            setHeureFin(decimalToTimeString(8.0 + tot + pause));
          } else {
            setHeureDebut('');
            setHeureFin('');
          }
          setTempsPause(pause);
          setHeuresSup(sup);
          setIsSupManuallyEdited(true);
          setShowAdvancedDetails(sup > 0);
          setValidationError(null);
        } else {
          // Jour non pointé (y compris au retour sur todayStr) : réinitialiser les champs
          setHeureDebut('');
          setHeureFin('');
          setTempsPause(DEFAULT_PAUSE);
          setHeuresSup(0);
          setIsSupManuallyEdited(false);
          setShowAdvancedDetails(false);
          setValidationError(null);
        }
        lastFormKeyRef.current = formKey;
      }

      if (profile.role === 'chef_equipe' || profile.role === 'admin') {
        const teamWorkers = allProfilesData.filter((p) => p.id !== profile.id);
        const agg = aggregateTeamDailyStatus(allDayPts, teamWorkers, selectedDateStr);
        setTeamStatuses(agg.statuses);
        setTeamSummary({
          totalTeamHours: agg.totalTeamHours,
          totalNormalHours: agg.totalNormalHours,
          totalOvertime: agg.totalOvertime,
          totalPause: agg.totalPause,
          workersCount: agg.workersCount,
          submittedCount: agg.submittedCount,
        });
      }
    } catch (err) {
      console.error('Erreur chargement données Home:', err);
    }
  }, [profile, selectedDateStr]);

  // Pull distant unique au montage / changement de profil (syncEngine.subscribe déclenche refreshData)
  useEffect(() => {
    if (profile?.id && typeof navigator !== 'undefined' && navigator.onLine) {
      void syncEngine.pullRemoteData();
    }
  }, [profile?.id]);

  // Chargement local immédiat + abonnement aux mises à jour SyncEngine
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await refreshData();
    };
    void load();

    const unsub = syncEngine.subscribe(() => {
      if (isMounted) void refreshData();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [refreshData]);

  // Chargement météo pour le chantier sélectionné
  useEffect(() => {
    if (selectedChantier?.latitude && selectedChantier?.longitude) {
      fetchChantierWeather(selectedChantier.latitude, selectedChantier.longitude).then(setWeather);
    } else {
      fetchChantierWeather().then(setWeather);
    }
  }, [selectedChantier]);

  const runValidation = useCallback(
    (debut: string, fin: string, pause: number, sup: number): boolean => {
      if (!debut || !fin) {
        setValidationError("Veuillez renseigner l'heure d'arrivée et l'heure de départ.");
        return false;
      }
      const rangeRes = validateTimeRange(debut, fin, pause);
      if (!rangeRes.valid) {
        setValidationError(rangeRes.error || 'Plage horaire non valide');
        return false;
      }
      const net = calculateDurationFromRange(debut, fin, pause);
      const dailyRes = validateDailyHours(net, pause, sup);
      if (!dailyRes.valid) {
        setValidationError(dailyRes.error || 'Saisie non valide');
        return false;
      }
      setValidationError(null);
      return true;
    },
    []
  );

  const handleTargetChange = (newTarget: number) => {
    const clamped = Math.max(1, Math.min(24, Math.round(newTarget * 100) / 100));
    setDailyTarget(clamped);
    setStoredDailyTarget(clamped, profile?.id);

    if (!isSupManuallyEdited) {
      const autoSup = calculateAutoOvertime(heuresTotales, clamped);
      setHeuresSup(autoSup);
      runValidation(heureDebut, heureFin, tempsPause, autoSup);
    }
  };

  const handleDebutChange = (newDebut: string) => {
    setHeureDebut(newDebut);
    const net = calculateDurationFromRange(newDebut, heureFin, tempsPause);
    if (!isSupManuallyEdited) {
      const autoSup = calculateAutoOvertime(net, dailyTarget);
      setHeuresSup(autoSup);
      runValidation(newDebut, heureFin, tempsPause, autoSup);
    } else {
      runValidation(newDebut, heureFin, tempsPause, heuresSup);
    }
  };

  const handleFinChange = (newFin: string) => {
    setHeureFin(newFin);
    const net = calculateDurationFromRange(heureDebut, newFin, tempsPause);
    if (!isSupManuallyEdited) {
      const autoSup = calculateAutoOvertime(net, dailyTarget);
      setHeuresSup(autoSup);
      runValidation(heureDebut, newFin, tempsPause, autoSup);
    } else {
      runValidation(heureDebut, newFin, tempsPause, heuresSup);
    }
  };

  const handleApplyPresetRange = (debut: string, fin: string) => {
    setHeureDebut(debut);
    setHeureFin(fin);
    const net = calculateDurationFromRange(debut, fin, tempsPause);
    if (!isSupManuallyEdited) {
      const autoSup = calculateAutoOvertime(net, dailyTarget);
      setHeuresSup(autoSup);
      runValidation(debut, fin, tempsPause, autoSup);
    } else {
      runValidation(debut, fin, tempsPause, heuresSup);
    }
  };

  const handlePauseChange = (val: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(val * 100) / 100));
    setTempsPause(clamped);
    const net = calculateDurationFromRange(heureDebut, heureFin, clamped);
    if (!isSupManuallyEdited) {
      const autoSup = calculateAutoOvertime(net, dailyTarget);
      setHeuresSup(autoSup);
      runValidation(heureDebut, heureFin, clamped, autoSup);
    } else {
      runValidation(heureDebut, heureFin, clamped, heuresSup);
    }
  };

  const handleSupChange = (val: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(val * 100) / 100));
    setHeuresSup(clamped);
    setIsSupManuallyEdited(true);
    runValidation(heureDebut, heureFin, tempsPause, clamped);
  };

  const handleRealignSup = () => {
    const autoSup = calculateAutoOvertime(heuresTotales, dailyTarget);
    setHeuresSup(autoSup);
    setIsSupManuallyEdited(false);
    runValidation(heureDebut, heureFin, tempsPause, autoSup);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    if (!runValidation(heureDebut, heureFin, tempsPause, heuresSup)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await syncEngine.saveDailyPointage({
        profile_id: profile.id,
        chantier_id: selectedChantier?.id || null,
        date: selectedDateStr,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        heures_totales: heuresTotales,
        temps_pause: tempsPause,
        heures_sup: heuresSup,
      });

      setLastUsedTimeRange(heureDebut, heureFin, profile.id);
      setLastUsedTimeRangeState(getLastUsedTimeRange(profile.id));
      setSubmitSuccess(true);
      isModalOpenRef.current = false;
      setIsModalOpen(false);
      setTimeout(() => setSubmitSuccess(false), 3000);
      await refreshData();
    } catch (err) {
      console.error('Erreur enregistrement heures:', err);
      setValidationError('Erreur lors de la sauvegarde locale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSaisie = (dateOrEvent?: string | React.SyntheticEvent) => {
    if (typeof dateOrEvent === 'string' && dateOrEvent !== selectedDateStr) {
      setSelectedDateStr(dateOrEvent);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    isModalOpenRef.current = false;
    setIsModalOpen(false);
    void refreshData();
  };

  const hasSubmittedToday = todayPointage !== null;
  const activeHours = hasSubmittedToday ? Number(todayPointage.heures_totales) || 0 : 0;
  const activeSup = hasSubmittedToday ? Number(todayPointage.heures_sup) || 0 : 0;
  const activePause = hasSubmittedToday ? Number(todayPointage.temps_pause) || 0 : 0;
  const activeNormal = calculateNormalHours(activeHours, activeSup);

  // Chantiers sélectionnables : strict pour ouvrier (uniquement ses affectations)
  const availableChantiers = profile?.role === 'ouvrier' ? assignedChantiers : allChantiers;
  const activeHeroChantier =
    selectedChantier ||
    availableChantiers[0] ||
    (profile?.role === 'ouvrier' ? null : allChantiers[0]) ||
    null;

  return {
    todayStr,
    selectedDateStr,
    setSelectedDateStr,
    allChantiers,
    availableChantiers,
    selectedChantier,
    setSelectedChantier,
    activeHeroChantier,
    todayPointage,
    weather,
    isSubmitting,
    submitSuccess,
    validationError,
    isModalOpen,
    setIsModalOpen,
    userAllPointages,
    dailyTarget,
    isEditingTarget,
    setIsEditingTarget,
    heureDebut,
    heureFin,
    tempsPause,
    heuresSup,
    isSupManuallyEdited,
    showAdvancedDetails,
    setShowAdvancedDetails,
    lastUsedTimeRange,
    calculatedAmplitude,
    heuresTotales,
    teamStatuses,
    teamSummary,
    hasSubmittedToday,
    activeHours,
    activeSup,
    activePause,
    activeNormal,
    handleTargetChange,
    handleDebutChange,
    handleFinChange,
    handleApplyPresetRange,
    handlePauseChange,
    handleSupChange,
    handleRealignSup,
    handleSubmit,
    handleOpenSaisie,
    handleCloseModal,
  };
}
