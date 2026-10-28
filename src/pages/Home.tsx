import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { db, getTodayDateString } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { fetchChantierWeather, type WeatherInfo } from '../lib/weather';
import {
  formatHours,
  validateDailyHours,
  aggregateTeamDailyStatus,
  calculateAutoOvertime,
  calculateNormalHours,
  getStoredDailyTarget,
  setStoredDailyTarget,
  type WorkerDailyStatus,
} from '../lib/hours';
import type { Chantier, PointageLocal } from '../types/database';
import {
  MapPin,
  Clock,
  CheckCircle2,
  CloudUpload,
  ChevronRight,
  Cloud,
  Sun,
  CloudRain,
  Navigation,
  Sparkles,
  Timer,
  AlertCircle,
  ShieldCheck,
  Briefcase,
  Save,
  Check,
  Plus,
  Minus,
  Target,
  Pencil,
  Scale,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { profile } = useAuth();
  const [allChantiers, setAllChantiers] = useState<Chantier[]>([]);
  const [assignedChantiers, setAssignedChantiers] = useState<Chantier[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [todayPointage, setTodayPointage] = useState<PointageLocal | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Objectif journalier paramétrable (persistance localStorage)
  const [dailyTarget, setDailyTarget] = useState<number>(() =>
    getStoredDailyTarget(profile?.id)
  );
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  // Champs de saisie déclarative
  const [heuresTotales, setHeuresTotales] = useState<number>(7);
  const [tempsPause, setTempsPause] = useState<number>(1);
  const [heuresSup, setHeuresSup] = useState<number>(0);
  const [isSupManuallyEdited, setIsSupManuallyEdited] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  // Données de supervision pour chef d'équipe / admin
  const [teamStatuses, setTeamStatuses] = useState<WorkerDailyStatus[]>([]);
  const [teamSummary, setTeamSummary] = useState({
    totalTeamHours: 0,
    totalNormalHours: 0,
    totalOvertime: 0,
    totalPause: 0,
    workersCount: 0,
    submittedCount: 0,
  });

  const todayStr = useMemo(() => getTodayDateString(0), []);

  const refreshData = useCallback(async () => {
    if (!profile) return;
    try {
      const currentTarget = getStoredDailyTarget(profile.id);
      setDailyTarget(currentTarget);

      const [chantiersData, myAffsData, existingPt, allProfilesData, allTodayPts] =
        await Promise.all([
          db.chantiers.toArray(),
          db.affectations.where({ profile_id: profile.id, date_intervention: todayStr }).toArray(),
          db.pointages.where('[profile_id+date]').equals([profile.id, todayStr]).first(),
          db.profiles.toArray(),
          db.pointages.where('date').equals(todayStr).toArray(),
        ]);

      setAllChantiers(chantiersData);

      // Chantiers affectés pour ce profil aujourd'hui
      const myChantierIds = myAffsData.map((a) => a.chantier_id);
      const myChantiers = chantiersData.filter((c) => myChantierIds.includes(c.id));
      setAssignedChantiers(myChantiers);

      // Pointage existant du jour pour l'utilisateur
      setTodayPointage(existingPt || null);

      // Pré-sélection du chantier
      if (existingPt?.chantier_id) {
        const matched = chantiersData.find((c) => c.id === existingPt.chantier_id);
        if (matched) setSelectedChantier(matched);
      } else if (profile.role === 'ouvrier') {
        setSelectedChantier((prev) => prev || myChantiers[0] || null);
      } else {
        const defaultCh = myChantiers[0] || chantiersData[0] || null;
        setSelectedChantier((prev) => prev || defaultCh);
      }

      // Pré-remplissage des champs du formulaire
      if (existingPt) {
        setHeuresTotales(Number(existingPt.heures_totales) || 0);
        setTempsPause(Number(existingPt.temps_pause) || 0);
        setHeuresSup(Number(existingPt.heures_sup) || 0);
        setIsSupManuallyEdited(true); // Conserve les valeurs enregistrées sans écrasement
      } else if (!hasLoadedInitial) {
        setHeuresTotales(currentTarget);
        setTempsPause(1);
        setHeuresSup(calculateAutoOvertime(currentTarget, currentTarget));
        setIsSupManuallyEdited(false);
      }
      setHasLoadedInitial(true);

      // Pour les chefs d'équipe et admins : calculer la synthèse de l'équipe
      if (profile.role === 'chef_equipe' || profile.role === 'admin') {
        const teamWorkers = allProfilesData.filter((p) => p.id !== profile.id);
        const agg = aggregateTeamDailyStatus(allTodayPts, teamWorkers, todayStr);
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
  }, [profile, todayStr, hasLoadedInitial]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      if (isMounted) await refreshData();
      if (navigator.onLine) {
        await syncEngine.pullRemoteData();
        if (isMounted) await refreshData();
      }
    };
    fetchInitial();

    const unsub = syncEngine.subscribe(() => {
      if (isMounted) refreshData();
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

  // Validation en temps réel
  const runValidation = (total: number, pause: number, sup: number): boolean => {
    const res = validateDailyHours(total, pause, sup);
    if (!res.valid) {
      setValidationError(res.error || 'Saisie non valide');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleTargetChange = (newTarget: number) => {
    const clamped = Math.max(1, Math.min(24, Math.round(newTarget * 100) / 100));
    setDailyTarget(clamped);
    setStoredDailyTarget(clamped, profile?.id);

    // Si les heures sup n'ont pas été personnalisées manuellement, répercuter le nouvel objectif
    if (!isSupManuallyEdited) {
      const autoSup = calculateAutoOvertime(heuresTotales, clamped);
      setHeuresSup(autoSup);
      runValidation(heuresTotales, tempsPause, autoSup);
    }
  };

  const handleTotalChange = (val: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(val * 100) / 100));
    setHeuresTotales(clamped);

    // Pré-sélection automatique des heures supplémentaires au-delà de l'objectif
    const autoSup = calculateAutoOvertime(clamped, dailyTarget);
    setHeuresSup(autoSup);
    setIsSupManuallyEdited(false);

    runValidation(clamped, tempsPause, autoSup);
  };

  const handlePauseChange = (val: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(val * 100) / 100));
    setTempsPause(clamped);
    runValidation(heuresTotales, clamped, heuresSup);
  };

  const handleSupChange = (val: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(val * 100) / 100));
    setHeuresSup(clamped);
    setIsSupManuallyEdited(true); // Saisie manuelle utilisateur prioritaire
    runValidation(heuresTotales, tempsPause, clamped);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    if (!runValidation(heuresTotales, tempsPause, heuresSup)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await syncEngine.saveDailyPointage({
        profile_id: profile.id,
        chantier_id: selectedChantier?.id || null,
        date: todayStr,
        heures_totales: heuresTotales,
        temps_pause: tempsPause,
        heures_sup: heuresSup,
      });

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      await refreshData();
    } catch (err) {
      console.error('Erreur enregistrement heures:', err);
      setValidationError('Erreur lors de la sauvegarde locale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedToday = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  // Progression et calculs d'heures (objectif paramétrable & sup incluses)
  const activeHours = todayPointage ? Number(todayPointage.heures_totales) || 0 : heuresTotales;
  const activeSup = todayPointage ? Number(todayPointage.heures_sup) || 0 : heuresSup;
  const activePause = todayPointage ? Number(todayPointage.temps_pause) || 0 : tempsPause;
  const activeNormal = calculateNormalHours(activeHours, activeSup);
  const progressPercent = Math.min(100, Math.round((activeHours / dailyTarget) * 100));

  // Chantiers sélectionnables : strict pour ouvrier (uniquement ses affectations)
  const availableChantiers = profile?.role === 'ouvrier' ? assignedChantiers : allChantiers;

  return (
    <div className="space-y-4">
      {/* 1. Salutation & Météo */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-sable/70 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-sauge capitalize block">
            {formattedToday}
          </span>
          <h1 className="text-lg font-extrabold text-foret">
            Bonjour, {profile?.prenom || 'Équipe'} 👋
          </h1>
        </div>

        {weather && (
          <div className="flex items-center gap-2 bg-craie px-3 py-2 rounded-xl border border-sable/60">
            {weather.iconName === 'sun' && <Sun className="w-5 h-5 text-amber-500" />}
            {weather.iconName === 'cloud' && <Cloud className="w-5 h-5 text-slate-500" />}
            {weather.iconName === 'cloud-rain' && <CloudRain className="w-5 h-5 text-blue-500" />}
            <div className="text-right">
              <span className="text-sm font-bold text-foret block leading-none">
                {weather.temperature}°C
              </span>
              <span className="text-[10px] text-sauge font-medium">{weather.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Chantier du jour (filtré pour l'ouvrier) */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" />
            {profile?.role === 'ouvrier' ? 'Votre chantier du jour' : 'Chantier sélectionné'}
          </span>
          {selectedChantier && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {selectedChantier.statut === 'en_cours' ? 'En cours' : 'Planifié'}
            </span>
          )}
        </div>

        {availableChantiers.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Aucun chantier ne vous est affecté aujourd'hui.
            </p>
            <p className="text-[11px] text-amber-700">
              Vous pouvez néanmoins enregistrer vos heures ou sélectionner un chantier si autorisé.
            </p>
          </div>
        ) : (
          <>
            {availableChantiers.length > 1 ? (
              <div className="relative">
                <select
                  value={selectedChantier?.id || ''}
                  onChange={(e) => {
                    const found = availableChantiers.find((c) => c.id === e.target.value);
                    if (found) setSelectedChantier(found);
                  }}
                  className="w-full text-sm font-bold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20 appearance-none pr-8 cursor-pointer"
                >
                  {availableChantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom_client}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foret/60">
                  ▼
                </div>
              </div>
            ) : (
              <h2 className="text-sm font-extrabold text-foret">{selectedChantier?.nom_client}</h2>
            )}

            {selectedChantier && (
              <div className="space-y-2 pt-1">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedChantier.adresse)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-xs text-foret/80 hover:text-terracotta transition-colors group"
                >
                  <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="underline-offset-2 group-hover:underline">
                    {selectedChantier.adresse}
                  </span>
                  <Navigation className="w-3.5 h-3.5 ml-auto text-foret/40 group-hover:text-terracotta" />
                </a>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <Link
                    to={`/chantier/${selectedChantier.id}`}
                    className="text-terracotta hover:text-terracotta/80 font-bold flex items-center gap-1"
                  >
                    <span>Consulter la fiche détaillée</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Statut journalier & Objectif paramétrable */}
      <div className="bg-foret text-sable rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sable">
              <Timer className="w-4 h-4 text-terracotta" />
            </div>
            <div>
              <span className="text-[11px] text-sable/70 uppercase tracking-wider block leading-none">
                Cumul du jour
              </span>
              <span className="text-xl font-extrabold text-white">
                {formatHours(activeHours)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[11px] text-sable/70">Objectif</span>
              <button
                type="button"
                onClick={() => setIsEditingTarget((prev) => !prev)}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-sable transition-colors cursor-pointer flex items-center gap-1"
                title="Modifier l'objectif journalier d'heures"
                aria-label="Modifier l'objectif journalier"
              >
                <Pencil className="w-2.5 h-2.5 text-terracotta" />
                <span>{isEditingTarget ? 'Fermer' : 'Modifier'}</span>
              </button>
            </div>
            <span className="text-sm font-bold text-sable">
              {formatHours(dailyTarget)} ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Panneau d'ajustement inline de l'objectif journalier */}
        {isEditingTarget && (
          <div className="p-3 bg-white/10 backdrop-blur-xs rounded-xl border border-white/15 text-xs text-sable space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-white">
                <Target className="w-3.5 h-3.5 text-terracotta" />
                Objectif journalier de référence :
              </span>
              <span className="font-extrabold text-amber-300 text-sm">
                {formatHours(dailyTarget)} / jour
              </span>
            </div>
            <p className="text-[11px] text-sable/80 leading-tight">
              Toute heure saisie au-delà de cet objectif sera automatiquement pré-sélectionnée comme heure supplémentaire (dont sup).
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleTargetChange(dailyTarget - 0.5)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white cursor-pointer"
                  aria-label="Diminuer objectif"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-extrabold text-white text-xs">
                  {formatHours(dailyTarget)}
                </span>
                <button
                  type="button"
                  onClick={() => handleTargetChange(dailyTarget + 0.5)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white cursor-pointer"
                  aria-label="Augmenter objectif"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {[7, 7.5, 8, 8.5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTargetChange(preset)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                      dailyTarget === preset
                        ? 'bg-terracotta text-white border-terracotta'
                        : 'bg-white/10 text-sable border-white/15 hover:bg-white/20'
                    }`}
                  >
                    {formatHours(preset)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsEditingTarget(false)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white text-foret hover:bg-sable transition-colors cursor-pointer ml-auto"
              >
                Valider
              </button>
            </div>
          </div>
        )}

        {/* Barre de progression */}
        <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-terracotta h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* État déclaratif & ventilation explicite (heures sup incluses) */}
        <div className="text-[11px] text-sable/80 flex flex-wrap items-center justify-between gap-1 pt-0.5">
          <span className="flex items-center gap-1">
            {todayPointage ? (
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Déclaré aujourd'hui
              </span>
            ) : (
              <span className="text-amber-200 font-medium">En attente de déclaration</span>
            )}
          </span>
          <span className="font-semibold text-white/90">
            {formatHours(activeNormal)} norm. + {formatHours(activeSup)} sup = {formatHours(activeHours)} total
            {activePause > 0 && ` • Pause : ${formatHours(activePause)}`}
          </span>
        </div>
      </div>

      {/* 4. Formulaire déclaratif journalier (Heures totales, Pause, Heures sup) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-4 border border-sable/90 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-sable/50 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-foret flex items-center gap-2">
              <Clock className="w-4 h-4 text-terracotta" />
              Déclaration des heures du jour
            </h2>
            <p className="text-[11px] text-sauge">
              Modifiable à tout moment de la journée (sauvegarde instantanée)
            </p>
          </div>
          {todayPointage && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                todayPointage.synced
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {todayPointage.synced ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Synchronisé
                </>
              ) : (
                <>
                  <CloudUpload className="w-3 h-3 text-amber-600 animate-pulse" />
                  En attente synchro
                </>
              )}
            </span>
          )}
        </div>

        {/* Message d'erreur de validation */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Message de succès */}
        {submitSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">Vos heures ont été enregistrées avec succès !</span>
          </div>
        )}

        {/* Champ 1 : Heures totales */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="input-heures-totales" className="text-xs font-bold text-foret">
              Heures totales travaillées (heures sup incluses) :{' '}
              <span className="text-terracotta">{formatHours(heuresTotales)}</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleTotalChange(heuresTotales - 0.5)}
                className="w-7 h-7 rounded-lg bg-craie hover:bg-sable/50 border border-sable flex items-center justify-center text-foret cursor-pointer"
                aria-label="Diminuer heures totales"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleTotalChange(heuresTotales + 0.5)}
                className="w-7 h-7 rounded-lg bg-craie hover:bg-sable/50 border border-sable flex items-center justify-center text-foret cursor-pointer"
                aria-label="Augmenter heures totales"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input
            id="input-heures-totales"
            type="number"
            step="0.25"
            min="0"
            max="24"
            value={heuresTotales}
            onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
            className="w-full text-base font-extrabold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20"
          />
          <p className="text-[10px] text-sauge">
            Total de votre temps travaillé dans la journée. Vos heures supplémentaires sont comprises dans ce chiffre.
          </p>
          {/* Boutons rapides pour heures totales */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[7, 7.5, 8, 8.5, 9].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleTotalChange(val)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  heuresTotales === val
                    ? 'bg-foret text-white border-foret'
                    : 'bg-craie text-foret/80 border-sable hover:bg-sable/50'
                }`}
              >
                {formatHours(val)}
              </button>
            ))}
          </div>
        </div>

        {/* Champ 2 : Temps de pause */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="input-temps-pause" className="text-xs font-bold text-foret">
              Durée de pause / déjeuner : <span className="text-terracotta">{formatHours(tempsPause)}</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePauseChange(tempsPause - 0.25)}
                className="w-7 h-7 rounded-lg bg-craie hover:bg-sable/50 border border-sable flex items-center justify-center text-foret cursor-pointer"
                aria-label="Diminuer pause"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handlePauseChange(tempsPause + 0.25)}
                className="w-7 h-7 rounded-lg bg-craie hover:bg-sable/50 border border-sable flex items-center justify-center text-foret cursor-pointer"
                aria-label="Augmenter pause"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input
            id="input-temps-pause"
            type="number"
            step="0.25"
            min="0"
            max="24"
            value={tempsPause}
            onChange={(e) => handlePauseChange(parseFloat(e.target.value) || 0)}
            className="w-full text-base font-extrabold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20"
          />
          <p className="text-[10px] text-sauge">
            Pause repas ou coupure non travaillée (déduite des heures nettes).
          </p>
          {/* Boutons rapides pour pause */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: 'Sans pause', val: 0 },
              { label: '30 min', val: 0.5 },
              { label: '45 min', val: 0.75 },
              { label: '1h00', val: 1 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => handlePauseChange(p.val)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  tempsPause === p.val
                    ? 'bg-foret text-white border-foret'
                    : 'bg-craie text-foret/80 border-sable hover:bg-sable/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Champ 3 : Heures supplémentaires */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="input-heures-sup" className="text-xs font-bold text-foret">
              Dont heures supplémentaires (incluses) :{' '}
              <span className="text-terracotta">{formatHours(heuresSup)}</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSupChange(heuresSup - 0.5)}
                className="w-7 h-7 rounded-lg bg-craie hover:bg-sable/50 border border-sable flex items-center justify-center text-foret cursor-pointer"
                aria-label="Diminuer heures sup"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSupChange(heuresSup + 0.5)}
                className="w-7 h-7 rounded-lg bg-craie hover:bg-sable/50 border border-sable flex items-center justify-center text-foret cursor-pointer"
                aria-label="Augmenter heures sup"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input
            id="input-heures-sup"
            type="number"
            step="0.25"
            min="0"
            max="24"
            value={heuresSup}
            onChange={(e) => handleSupChange(parseFloat(e.target.value) || 0)}
            className="w-full text-base font-extrabold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20"
          />
          <div className="flex items-center justify-between text-[10px] text-sauge">
            <span>
              Part incluse dans les {formatHours(heuresTotales)} totales (auto au-delà de {formatHours(dailyTarget)}).
            </span>
            {isSupManuallyEdited ? (
              <span className="text-amber-700 font-semibold">(Saisie manuelle)</span>
            ) : (
              <span className="text-emerald-700 font-semibold">(Pré-sélection auto)</span>
            )}
          </div>
          {/* Boutons rapides pour heures sup */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[0, 0.5, 1, 1.5, 2].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSupChange(val)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  heuresSup === val
                    ? 'bg-foret text-white border-foret'
                    : 'bg-craie text-foret/80 border-sable hover:bg-sable/50'
                }`}
              >
                {val === 0 ? '0h (Aucune)' : `+${formatHours(val)}`}
              </button>
            ))}
          </div>
        </div>

        {/* Carte de ventilation en temps réel */}
        <div className="p-3.5 bg-craie rounded-xl border border-sable/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foret uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-terracotta" />
              Ventilation du temps de travail
            </span>
            {isSupManuallyEdited && (
              <button
                type="button"
                onClick={() => {
                  const autoSup = calculateAutoOvertime(heuresTotales, dailyTarget);
                  setHeuresSup(autoSup);
                  setIsSupManuallyEdited(false);
                  runValidation(heuresTotales, tempsPause, autoSup);
                }}
                className="text-[10px] font-bold text-terracotta hover:underline cursor-pointer flex items-center gap-1"
                title="Rétablir la pré-sélection basée sur l'objectif"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réaligner sur objectif ({formatHours(calculateAutoOvertime(heuresTotales, dailyTarget))} sup)</span>
              </button>
            )}
          </div>

          <div className="p-3 bg-white rounded-xl border border-sable/70 space-y-1.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-extrabold text-sm text-foret bg-sable/40 px-2 py-0.5 rounded-lg">
                {formatHours(heuresTotales)} travaillées au total
              </span>
              <span className="text-sauge font-bold">=</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {formatHours(calculateNormalHours(heuresTotales, heuresSup))} normales
              </span>
              <span className="text-sauge font-bold">+</span>
              <span className="font-bold text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-lg border border-terracotta/20">
                {formatHours(heuresSup)} {heuresSup > 1 ? 'supplémentaires' : 'supplémentaire'}
              </span>
            </div>

            <p className="text-[11px] text-sauge leading-relaxed pt-0.5">
              💡 <strong>Rappel :</strong> les {formatHours(heuresSup)} sup sont <u>déjà incluses</u> dans les {formatHours(heuresTotales)} totales (elles ne s'y ajoutent pas).
              {tempsPause > 0 && ` • Pause déduite : ${formatHours(tempsPause)}.`}
            </p>
          </div>
        </div>

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={isSubmitting || Boolean(validationError)}
          className="w-full py-3.5 px-4 bg-terracotta hover:bg-terracotta/90 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-terracotta/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>
            {isSubmitting
              ? 'Enregistrement en cours...'
              : todayPointage
              ? 'Mettre à jour mes heures'
              : 'Enregistrer mes heures'}
          </span>
        </button>
      </form>

      {/* 5. Espace Superviseur : Suivi des pointages de l'équipe (Chef d'équipe & Admin) */}
      {(profile?.role === 'chef_equipe' || profile?.role === 'admin') && (
        <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Suivi de l'équipe (Aujourd'hui)
            </span>
            <span className="text-xs text-foret/60">
              {teamSummary.submittedCount} / {teamSummary.workersCount} déclarés
            </span>
          </div>

          {/* Synthèse globale équipe */}
          <div className="grid grid-cols-2 gap-2 bg-craie p-3 rounded-xl border border-sable/60 text-xs">
            <div>
              <span className="text-[10px] text-sauge font-medium block">Total heures équipe :</span>
              <span className="text-base font-extrabold text-foret">
                {formatHours(teamSummary.totalTeamHours)}
              </span>
              <span className="text-[10px] text-sauge font-medium block">
                ({formatHours(teamSummary.totalNormalHours)} norm. + {formatHours(teamSummary.totalOvertime)} sup)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-sauge font-medium block">Dont heures sup :</span>
              <span className="text-base font-extrabold text-terracotta">
                {formatHours(teamSummary.totalOvertime)}
              </span>
              <span className="text-[10px] text-sauge font-medium block">
                Incluses dans le total
              </span>
            </div>
          </div>

          {/* Liste détaillée des ouvriers */}
          <div className="divide-y divide-sable/50">
            {teamStatuses.map((m) => {
              const matchedChantier = m.chantierId
                ? allChantiers.find((c) => c.id === m.chantierId)
                : undefined;

              return (
                <div key={m.profile.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-foret text-sable font-bold text-xs flex items-center justify-center">
                      {m.profile.prenom.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-foret">
                        {m.profile.prenom} {m.profile.nom}
                      </p>
                      <p className="text-[10px] text-foret/60 truncate max-w-[150px]">
                        {matchedChantier?.nom_client || 'Aucun chantier'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.hasSubmitted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-sable/60 text-foret/60'
                      }`}
                    >
                      {m.hasSubmitted
                        ? `🟢 ${formatHours(m.heuresTotales)} au total`
                        : '⚪ Non déclaré'}
                    </span>
                    {m.hasSubmitted && (
                      <p className="text-[10px] font-semibold text-foret/70">
                        {formatHours(calculateNormalHours(m.heuresTotales, m.heuresSup))} norm. + {formatHours(m.heuresSup)} sup
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raccourci Gestion des Chantiers pour Chef d'équipe / Admin */}
      {(profile?.role === 'chef_equipe' || profile?.role === 'admin') && (
        <div className="bg-white rounded-2xl p-4 border border-sable/90 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foret text-sable flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foret">Gestion des chantiers</h3>
              <p className="text-[11px] text-foret/70">Créer, modifier & affecter les chantiers</p>
            </div>
          </div>
          <Link
            to="/chantiers"
            className="px-3.5 py-2 bg-foret hover:bg-foret/90 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs shrink-0 transition-colors"
          >
            <span>Gérer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 6. Récapitulatif de ma déclaration journalière */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
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
            <p>Aucune heure enregistrée aujourd'hui.</p>
            <p className="text-[11px] text-sauge">
              Complétez le formulaire ci-dessus pour déclarer vos heures travaillées.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-craie rounded-xl border border-sable/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-sauge font-bold uppercase block">
                  Heures totales déclarées
                </span>
                <span className="text-lg font-extrabold text-foret">
                  {formatHours(Number(todayPointage.heures_totales) || 0)}
                </span>
                <span className="text-[11px] text-sauge block">
                  (dont {formatHours(Number(todayPointage.heures_sup) || 0)} supplémentaires)
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
                <p className="font-bold text-foret">
                  {formatHours(
                    calculateNormalHours(
                      Number(todayPointage.heures_totales) || 0,
                      Number(todayPointage.heures_sup) || 0
                    )
                  )}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-sauge font-medium">Dont heures sup :</span>
                <p className="font-bold text-terracotta">
                  {formatHours(Number(todayPointage.heures_sup) || 0)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-sauge font-medium">Temps de pause :</span>
                <p className="font-bold text-foret">
                  {formatHours(Number(todayPointage.temps_pause) || 0)}
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-sable/50 text-[11px] text-foret font-medium text-center shadow-2xs">
              💡 Détail du jour :{' '}
              <span className="font-bold text-emerald-800">
                {formatHours(
                  calculateNormalHours(
                    Number(todayPointage.heures_totales) || 0,
                    Number(todayPointage.heures_sup) || 0
                  )
                )}
              </span>{' '}
              normales +{' '}
              <span className="font-bold text-terracotta">
                {formatHours(Number(todayPointage.heures_sup) || 0)}
              </span>{' '}
              sup ={' '}
              <span className="font-extrabold text-foret">
                {formatHours(Number(todayPointage.heures_totales) || 0)}
              </span>{' '}
              au total
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
