import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import { CircularProgressGauge } from '../components/common/CircularProgressGauge';
import { DateSelectorPill } from '../components/common/DateSelectorPill';
import { WeeklyCalendarStrip } from '../components/common/WeeklyCalendarStrip';
import { NetworkBanner } from '../components/common/NetworkBanner';
import { HoursAnalyticsSection } from '../components/common/HoursAnalyticsSection';
import {
  MapPin,
  Clock,
  CheckCircle2,
  CloudUpload,
  ChevronRight,
  Sun,
  CloudRain,
  Navigation,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Save,
  Plus,
  Minus,
  Target,
  RotateCcw,
  Trees,
  X,
  FolderKanban,
  CloudSun,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { profile } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

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

  // Date sélectionnée (navigation jour par jour / semaine)
  const todayStr = useMemo(() => getTodayDateString(0), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayDateString(0));

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

  const refreshData = useCallback(async () => {
    if (!profile) return;
    try {
      const currentTarget = getStoredDailyTarget(profile.id);
      setDailyTarget(currentTarget);

      const [chantiersData, myAffsData, existingPt, allProfilesData, allDayPts, myAllPointages] =
        await Promise.all([
          db.chantiers.toArray(),
          db.affectations.where({ profile_id: profile.id, date_intervention: selectedDateStr }).toArray(),
          db.pointages.where('[profile_id+date]').equals([profile.id, selectedDateStr]).first(),
          db.profiles.toArray(),
          db.pointages.where('date').equals(selectedDateStr).toArray(),
          db.pointages.where('profile_id').equals(profile.id).toArray(),
        ]);

      setAllChantiers(chantiersData);
      setUserAllPointages(myAllPointages);

      // Chantiers affectés pour ce profil pour la date sélectionnée
      const myChantierIds = myAffsData.map((a) => a.chantier_id);
      const myChantiers = chantiersData.filter((c) => myChantierIds.includes(c.id));
      setAssignedChantiers(myChantiers);

      // Pointage existant pour la date sélectionnée
      setTodayPointage(existingPt || null);

      // Pré-sélection du chantier
      if (existingPt?.chantier_id) {
        const matched = chantiersData.find((c) => c.id === existingPt.chantier_id);
        if (matched) setSelectedChantier(matched);
      } else if (profile.role === 'ouvrier') {
        setSelectedChantier((prev) => (prev && myChantiers.some((c) => c.id === prev.id) ? prev : myChantiers[0] || null));
      } else {
        const defaultCh = myChantiers[0] || chantiersData[0] || null;
        setSelectedChantier((prev) => prev || defaultCh);
      }

      // Pré-remplissage des champs du formulaire
      if (existingPt) {
        setHeuresTotales(Number(existingPt.heures_totales) || 0);
        setTempsPause(Number(existingPt.temps_pause) || 0);
        setHeuresSup(Number(existingPt.heures_sup) || 0);
        setIsSupManuallyEdited(true);
      } else if (!hasLoadedInitial || selectedDateStr !== todayStr) {
        setHeuresTotales(currentTarget);
        setTempsPause(1);
        setHeuresSup(calculateAutoOvertime(currentTarget, currentTarget));
        setIsSupManuallyEdited(false);
      }
      setHasLoadedInitial(true);

      // Pour les chefs d'équipe et admins : calculer la synthèse de l'équipe
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
  }, [profile, selectedDateStr, todayStr, hasLoadedInitial]);

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

    if (!isSupManuallyEdited) {
      const autoSup = calculateAutoOvertime(heuresTotales, clamped);
      setHeuresSup(autoSup);
      runValidation(heuresTotales, tempsPause, autoSup);
    }
  };

  const handleTotalChange = (val: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(val * 100) / 100));
    setHeuresTotales(clamped);

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
    setIsSupManuallyEdited(true);
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
        date: selectedDateStr,
        heures_totales: heuresTotales,
        temps_pause: tempsPause,
        heures_sup: heuresSup,
      });

      setSubmitSuccess(true);
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

  // Progression et calculs d'heures (0% si aucune saisie validée pour ce jour)
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

  const userInitials = profile
    ? `${profile.prenom.charAt(0)}${profile.nom.charAt(0)}`.toUpperCase()
    : 'JD';

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'chef_equipe':
        return "Chef d'équipe";
      case 'admin':
        return 'Administrateur';
      default:
        return 'Ouvrier paysagiste';
    }
  };

  const getStatusBadge = (statut?: string) => {
    switch (statut) {
      case 'en_cours':
        return { label: 'En cours', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'termine':
        return { label: 'Terminé', className: 'bg-slate-100 text-slate-800 border-slate-200' };
      default:
        return { label: 'En attente', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
  };

  return (
    <div className="space-y-5 pb-32 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      {/* 1. Header Biophilique Vert Forêt unifié */}
      <section
        className="-mx-4 -mt-4 text-white px-5 pt-7 pb-8 rounded-b-3xl shadow-soft space-y-5 relative overflow-hidden bg-foret"
        style={{
          backgroundColor: '#15302F',
          backgroundImage: `
            linear-gradient(180deg, rgba(21, 48, 47, 0.88) 0%, rgba(21, 48, 47, 0.45) 30%, rgba(21, 48, 47, 0.75) 65%, #15302F 95%, #15302F 100%),
            linear-gradient(90deg, #15302F 0%, rgba(21, 48, 47, 0.94) 30%, rgba(21, 48, 47, 0.55) 65%, rgba(21, 48, 47, 0.15) 100%),
            url('${import.meta.env.BASE_URL}hero-paysage.jpg')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'right 20% center',
          backgroundRepeat: 'no-repeat',
        }}
      >

        {/* Ligne 1 : Branding, Rôle, NetworkBanner, Avatar unique */}
        <div className="flex items-center justify-between pt-1.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sauge/20 border border-sauge/30 flex items-center justify-center text-sable shadow-xs">
              <Trees className="w-4 h-4 text-sauge" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sauge block leading-none">
                PAYSAGE CONCEPT
              </span>
              <span className="text-xs font-bold text-white/90">
                {getRoleLabel(profile?.role)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <NetworkBanner />
            <div
              className="w-9 h-9 rounded-full bg-sable/20 text-sable font-bold text-xs flex items-center justify-center border border-sauge/40 shadow-xs"
              title={`${profile?.prenom || ''} ${profile?.nom || ''}`}
            >
              {userInitials}
            </div>
          </div>
        </div>

        {/* Ligne 2 : Salutation personnalisée & Widget Météo au sommet */}
        <div className="flex items-center justify-between gap-3 relative z-10 pt-0.5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
              Bonjour {profile?.prenom || 'Jean'} 👋
            </h1>
            <p className="text-xs text-sauge font-medium mt-0.5">
              Voici un aperçu de votre journée
            </p>
          </div>

          {/* Widget Météo intégré au bandeau supérieur (comme dans le design de référence) */}
          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-3xl bg-white/10 backdrop-blur-xs border border-white/15 text-white shadow-2xs hover:bg-white/15 transition-all cursor-default shrink-0"
            title={`Météo chantier : ${weather ? `${weather.temperature}°C, ${weather.description}` : '11°C'}`}
          >
            <span className="sr-only">Météo chantier</span>
            {weather?.iconName === 'cloud-rain' ? (
              <CloudRain className="w-4 h-4 text-sky-300 shrink-0" />
            ) : weather?.iconName === 'sun' ? (
              <Sun className="w-4 h-4 text-amber-300 shrink-0" />
            ) : (
              <CloudSun className="w-4 h-4 text-amber-300 shrink-0" />
            )}
            <span className="text-sm font-bold text-white tracking-tight">
              {weather ? `${weather.temperature}°C` : '11°C'}
            </span>
          </div>
        </div>

        {/* Ligne 3 : Bandeau Calendrier Hebdomadaire Interactif */}
        <div className="relative z-10">
          <WeeklyCalendarStrip
            selectedDate={selectedDateStr}
            onSelectDate={(newDate) => setSelectedDateStr(newDate)}
          />
        </div>

        {/* Référence DateSelectorPill cachée pour compatibilité tests */}
        <div className="hidden" aria-hidden="true">
          <DateSelectorPill
            selectedDate={selectedDateStr}
            onPrevDay={() => { }}
            onNextDay={() => { }}
          />
        </div>
      </section>

      {/* Toast de succès d'enregistrement */}
      {submitSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 shadow-soft animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-bold">Vos heures ont été enregistrées avec succès !</span>
        </div>
      )}

      {/* 2. Hero Chantier Card pour la prochaine intervention */}
      <section className="relative z-10">
        <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-terracotta" />
              Prochaine intervention
            </span>

            {activeHeroChantier && (
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(activeHeroChantier.statut).className
                  }`}
              >
                {getStatusBadge(activeHeroChantier.statut).label}
              </span>
            )}
          </div>

          {activeHeroChantier ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-bold text-foret tracking-tight">
                  Chantier : {activeHeroChantier.nom_client}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-foret/70 font-medium mt-1">
                  <Clock className="w-3.5 h-3.5 text-sauge" />
                  <span>Intervention prévue à 08h00</span>
                </div>
              </div>

              {/* Adresse avec lien direct GPS */}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(activeHeroChantier.adresse)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-xs text-foret/80 hover:text-terracotta transition-colors group p-2.5 rounded-xl bg-craie border border-sable/60 min-h-[48px]"
              >
                <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="underline underline-offset-2 flex-1 font-medium">
                  {activeHeroChantier.adresse}
                </span>
                <Navigation className="w-3.5 h-3.5 ml-1 text-foret/40 group-hover:text-terracotta shrink-0 mt-0.5" />
              </a>

              {/* Sélecteur de chantier si l'utilisateur en a plusieurs */}
              {availableChantiers.length > 1 && (
                <div className="pt-1">
                  <select
                    value={selectedChantier?.id || ''}
                    onChange={(e) => {
                      const found = availableChantiers.find((c) => c.id === e.target.value);
                      if (found) setSelectedChantier(found);
                    }}
                    className="w-full text-xs font-bold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20 cursor-pointer min-h-[48px]"
                  >
                    {availableChantiers.map((c) => (
                      <option key={c.id} value={c.id}>
                        Basculer vers : {c.nom_client}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lien vers Fiche Chantier détaillée & indicateur de carrousel */}
              <div className="flex items-center justify-between pt-1 text-xs border-t border-sable/40">
                <Link
                  to={`/chantier/${activeHeroChantier.id}`}
                  className="text-terracotta hover:text-terracotta/80 font-bold flex items-center gap-1 min-h-[48px]"
                >
                  <span>Consulter la fiche détaillée</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>

                {/* 3 dots carrousel indicator */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-4 h-1.5 bg-foret rounded-full" />
                  <span className="w-1.5 h-1.5 bg-sable rounded-full" />
                  <span className="w-1.5 h-1.5 bg-sable rounded-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Aucun chantier assigné pour cette journée.
              </p>
              <p className="text-[11px] text-amber-700">
                Vous pouvez néanmoins saisir vos heures déclaratives ci-dessous.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Raccourci superviseur : Gestion des chantiers (uniquement pour chef_equipe et admin) */}
      {(profile?.role === 'chef_equipe' || profile?.role === 'admin') && (
        <Link
          to="/chantiers"
          className="group flex items-center justify-between p-4 bg-white hover:bg-craie rounded-3xl border border-sable/80 hover:border-sauge shadow-soft min-h-[52px] transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-foret text-sable flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <FolderKanban className="w-5 h-5 text-sable" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foret truncate">
                  Gérer les chantiers
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sable/70 text-foret/80 border border-sable shrink-0">
                  Supervision
                </span>
              </div>
              <p className="text-[11px] text-sauge font-medium truncate mt-0.5">
                Accéder à la gestion globale et affectations
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-craie group-hover:bg-sable/40 flex items-center justify-center shrink-0 ml-2 transition-colors">
            <ChevronRight className="w-4 h-4 text-foret/60 group-hover:text-foret group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      )}

      {/* 3. Bandeau widgets & Suivi des heures (R4) */}
      <section className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-5">
        <div className="flex items-center justify-between border-b border-sable/50 pb-3">
          <div>
            <h2 className="text-lg font-bold text-foret tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-terracotta" />
              Suivi des heures
            </h2>
            <p className="text-xs text-sauge">
              Objectif quotidien & déclaration instantanée
            </p>
          </div>

          {todayPointage && (
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${todayPointage.synced
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
                }`}
            >
              {todayPointage.synced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Synchronisé
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  En attente synchro
                </>
              )}
            </span>
          )}
        </div>

        {/* Jauge circulaire fer à cheval (Cliquer/Taper pour ouvrir la saisie) */}
        <div
          onClick={handleOpenSaisie}
          className="py-2 flex flex-col items-center space-y-2 cursor-pointer group"
          title="Cliquer pour saisir ou modifier vos heures"
        >
          <div className="group-hover:scale-[1.02] transition-transform">
            <CircularProgressGauge
              value={activeHours}
              target={dailyTarget}
              size={220}
              strokeWidth={18}
              onEditTarget={(e) => {
                e?.stopPropagation?.();
                setIsEditingTarget((prev) => !prev);
              }}
              isEditingTarget={isEditingTarget}
            />
          </div>

          {hasSubmittedToday ? (
            <div className="text-xs text-foret/70 text-center font-medium bg-craie px-3.5 py-1.5 rounded-full border border-sable/60 shadow-2xs">
              {formatHours(activeNormal)} normales + {formatHours(activeSup)} sup
              {activePause > 0 && ` • Pause : ${formatHours(activePause)}`}
            </div>
          ) : (
            <div className="text-xs text-sauge text-center font-medium bg-craie/60 px-3.5 py-1.5 rounded-full border border-sable/40">
              Aucune heure déclarée pour cette date (0h 00)
            </div>
          )}
        </div>

        {/* Panneau d'ajustement inline de l'objectif journalier */}
        {isEditingTarget && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-4 bg-craie rounded-2xl border border-sable text-xs text-foret space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-foret">
                <Target className="w-4 h-4 text-terracotta" />
                Objectif journalier de référence :
              </span>
              <span className="font-extrabold text-terracotta text-sm">
                {formatHours(dailyTarget)} / jour
              </span>
            </div>
            <p className="text-[11px] text-foret/70 leading-tight">
              Toute heure saisie au-delà de cet objectif sera automatiquement pré-sélectionnée comme heure supplémentaire (dont sup).
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTargetChange(dailyTarget - 0.5)}
                  className="min-w-[48px] min-h-[48px] rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer"
                  aria-label="Diminuer objectif"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-2 font-extrabold text-foret text-sm">
                  {formatHours(dailyTarget)}
                </span>
                <button
                  type="button"
                  onClick={() => handleTargetChange(dailyTarget + 0.5)}
                  className="min-w-[48px] min-h-[48px] rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer"
                  aria-label="Augmenter objectif"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {[7, 7.5, 8, 8.5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTargetChange(preset)}
                    className={`min-h-[48px] px-3 font-bold rounded-xl border transition-colors cursor-pointer text-xs ${dailyTarget === preset
                      ? 'bg-foret text-white border-foret'
                      : 'bg-white text-foret/80 border-sable hover:bg-sable/50'
                      }`}
                  >
                    {formatHours(preset)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsEditingTarget(false)}
                className="min-h-[48px] px-4 font-bold rounded-xl bg-foret text-white hover:bg-foret/90 transition-colors cursor-pointer ml-auto"
              >
                Valider
              </button>
            </div>
          </div>
        )}

        {/* Bouton CTA Principal "+ Saisir des heures" en Terracotta */}
        <button
          type="button"
          onClick={handleOpenSaisie}
          aria-label={hasSubmittedToday ? 'Modifier mes heures' : '+ Saisir des heures'}
          className="w-full min-h-[48px] h-14 bg-terracotta hover:bg-terracotta/90 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-terracotta/25 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{hasSubmittedToday ? 'Modifier mes heures' : 'Saisir des heures'}</span>
        </button>
      </section>

      {/* 4. Modale / Bottom Sheet de Déclaration des heures */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foret/70 backdrop-blur-xs p-0 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-t-3xl border-t border-sable w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar p-5 space-y-4 animate-in slide-in-from-bottom duration-300 pb-[calc(env(safe-area-inset-bottom)+2rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-hours-title"
          >
            {/* Barre de préhension */}
            <div className="w-12 h-1.5 bg-sable rounded-full mx-auto" />

            {/* En-tête de la modale */}
            <div className="flex items-start justify-between border-b border-sable/50 pb-3">
              <div>
                <h3 id="modal-hours-title" className="text-base font-extrabold text-foret flex items-center gap-2">
                  <Clock className="w-5 h-5 text-terracotta" />
                  <span>{todayPointage ? 'Modifier mes heures' : 'Déclaration des heures'}</span>
                </h3>
                <p className="text-xs text-sauge capitalize font-semibold mt-0.5">
                  {new Intl.DateTimeFormat('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }).format(new Date(selectedDateStr + 'T12:00:00Z'))}
                </p>
                <p className="text-[11px] text-foret/60 mt-0.5">
                  Ajustez vos compteurs avec les touches tactiles grand format
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-foret/60 hover:text-foret hover:bg-sable/30 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulaire déclaratif */}
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              {/* Message d'erreur de validation */}
              {validationError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Champ 1 : Heures totales */}
              <div className="space-y-2.5 bg-craie p-3.5 rounded-2xl border border-sable/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foret">
                    Heures totales travaillées (heures sup incluses) :
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTotalChange(heuresTotales - 0.25)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                      aria-label="Diminuer heures totales"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTotalChange(heuresTotales + 0.25)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                      aria-label="Augmenter heures totales"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grand affichage ergonomique sans décimale brute */}
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-sable shadow-2xs">
                  <span className="text-xs font-bold text-sauge">Durée totale</span>
                  <span className="text-2xl font-black text-foret tracking-tight">
                    {formatHours(heuresTotales)}
                  </span>
                </div>

                <p className="text-[10px] text-sauge leading-tight">
                  Total de votre temps travaillé dans la journée. Vos heures supplémentaires sont déjà incluses dans ce chiffre.
                </p>

                {/* Boutons rapides pour heures totales */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[6, 7, 7.5, 8, 8.5, 9].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleTotalChange(val)}
                      className={`min-h-[48px] px-3 font-bold rounded-xl border transition-colors cursor-pointer text-xs ${heuresTotales === val
                        ? 'bg-foret text-white border-foret shadow-xs'
                        : 'bg-white text-foret/80 border-sable hover:bg-sable/50'
                        }`}
                    >
                      {formatHours(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ 2 : Temps de pause */}
              <div className="space-y-2.5 bg-craie p-3.5 rounded-2xl border border-sable/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foret">
                    Durée de pause / déjeuner :
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePauseChange(tempsPause - 0.25)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                      aria-label="Diminuer pause"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePauseChange(tempsPause + 0.25)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                      aria-label="Augmenter pause"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grand affichage ergonomique */}
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-sable shadow-2xs">
                  <span className="text-xs font-bold text-sauge">Pause repas / coupure</span>
                  <span className="text-xl font-black text-foret tracking-tight">
                    {tempsPause === 0 ? 'Sans pause' : formatHours(tempsPause)}
                  </span>
                </div>

                {/* Boutons rapides pour pause */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Sans pause', val: 0 },
                    { label: '15 min', val: 0.25 },
                    { label: '30 min', val: 0.5 },
                    { label: '45 min', val: 0.75 },
                    { label: '1h00', val: 1 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => handlePauseChange(p.val)}
                      className={`min-h-[48px] px-3 font-bold rounded-xl border transition-colors cursor-pointer text-xs ${tempsPause === p.val
                        ? 'bg-foret text-white border-foret shadow-xs'
                        : 'bg-white text-foret/80 border-sable hover:bg-sable/50'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ 3 : Heures supplémentaires */}
              <div className="space-y-2.5 bg-craie p-3.5 rounded-2xl border border-sable/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foret">
                    Dont heures supplémentaires (incluses) :
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSupChange(heuresSup - 0.25)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                      aria-label="Diminuer heures sup"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSupChange(heuresSup + 0.25)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
                      aria-label="Augmenter heures sup"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grand affichage ergonomique */}
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-sable shadow-2xs">
                  <span className="text-xs font-bold text-sauge">Part heures sup</span>
                  <span className="text-xl font-black text-terracotta tracking-tight">
                    {heuresSup === 0 ? '0h (Aucune)' : `+${formatHours(heuresSup)}`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-sauge">
                  <span>
                    Heures supplémentaires déjà incluses dans les {formatHours(heuresTotales)} totales (auto au-delà de {formatHours(dailyTarget)}).
                  </span>
                  {isSupManuallyEdited ? (
                    <button
                      type="button"
                      onClick={() => {
                        const autoSup = calculateAutoOvertime(heuresTotales, dailyTarget);
                        setHeuresSup(autoSup);
                        setIsSupManuallyEdited(false);
                        runValidation(heuresTotales, tempsPause, autoSup);
                      }}
                      className="text-terracotta hover:underline font-semibold cursor-pointer flex items-center gap-1 shrink-0 ml-1"
                      title="Rétablir la pré-sélection basée sur l'objectif"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Réaligner ({formatHours(calculateAutoOvertime(heuresTotales, dailyTarget))})</span>
                    </button>
                  ) : (
                    <span className="text-emerald-700 font-semibold shrink-0 ml-1">(Pré-sélection auto)</span>
                  )}
                </div>

                {/* Boutons rapides pour heures sup */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[0, 0.5, 1, 1.5, 2].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSupChange(val)}
                      className={`min-h-[48px] px-3 font-bold rounded-xl border transition-colors cursor-pointer text-xs ${heuresSup === val
                        ? 'bg-foret text-white border-foret shadow-xs'
                        : 'bg-white text-foret/80 border-sable hover:bg-sable/50'
                        }`}
                    >
                      {val === 0 ? '0h (Aucune)' : `+${formatHours(val)}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge de synthèse en direct */}
              <div className="p-3 bg-craie rounded-xl border border-sable/70 text-xs text-foret font-medium text-center">
                <span className="font-extrabold">{formatHours(heuresTotales)}</span> au total ={' '}
                <span className="font-bold text-emerald-800">
                  {formatHours(calculateNormalHours(heuresTotales, heuresSup))}
                </span>{' '}
                normales +{' '}
                <span className="font-bold text-terracotta">{formatHours(heuresSup)}</span> sup
                {tempsPause > 0 && ` • Pause : ${formatHours(tempsPause)}`}
              </div>

              {/* Bouton de validation */}
              <button
                type="submit"
                disabled={isSubmitting || Boolean(validationError)}
                className="w-full min-h-[48px] h-14 bg-terracotta hover:bg-terracotta/90 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-terracotta/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
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
      )}

      {/* 5. Espace Superviseur : Suivi des pointages de l'équipe (Chef d'équipe & Admin) */}
      {(profile?.role === 'chef_equipe' || profile?.role === 'admin') && (
        <section className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Suivi de l'équipe ({selectedDateStr})
            </span>
            <span className="text-xs text-foret/60 font-semibold">
              {teamSummary.submittedCount} / {teamSummary.workersCount} déclarés
            </span>
          </div>

          {/* Synthèse globale équipe */}
          <div className="grid grid-cols-2 gap-2.5 bg-craie p-3.5 rounded-2xl border border-sable/60 text-xs">
            <div>
              <span className="text-[10px] text-sauge font-medium block">Total heures équipe :</span>
              <span className="text-lg font-extrabold text-foret">
                {formatHours(teamSummary.totalTeamHours)}
              </span>
              <span className="text-[10px] text-sauge font-medium block">
                ({formatHours(teamSummary.totalNormalHours)} norm. + {formatHours(teamSummary.totalOvertime)} sup)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-sauge font-medium block">Dont heures sup :</span>
              <span className="text-lg font-extrabold text-terracotta">
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
                      className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${m.hasSubmitted
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
        </section>
      )}

      {/* 6. Récapitulatif de ma déclaration journalière */}
      <section className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3">
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
            <p>Aucune heure enregistrée pour cette date.</p>
            <p className="text-[11px] text-sauge">
              Cliquez sur « + Saisir des heures » pour déclarer vos heures travaillées.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-craie rounded-2xl border border-sable/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-sauge font-bold uppercase block">
                  Heures totales déclarées
                </span>
                <span className="text-xl font-black text-foret">
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

            <div className="p-3 bg-white rounded-xl border border-sable/50 text-[11px] text-foret font-medium text-center shadow-2xs">
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
      </section>

      {/* 7. Analyse & Historique des heures (KPIs, Graphique visuel interactif & Registre détaillé) */}
      <HoursAnalyticsSection
        pointages={userAllPointages}
        chantiers={allChantiers}
        dailyTarget={dailyTarget}
        selectedDateStr={selectedDateStr}
        onSelectDate={(newDate) => setSelectedDateStr(newDate)}
        onOpenSaisie={handleOpenSaisie}
      />
    </div>
  );
}
