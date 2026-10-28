import { useEffect, useState, useMemo, useCallback } from 'react';
import { db, getTodayDateString } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { useAuth } from '../context/useAuth';
import type { Chantier, Affectation, Profile } from '../types/database';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  ExternalLink,
  ChevronRight as ArrowRightIcon,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Phone,
  MessageSquare,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type ViewMode = 'day' | 'week' | 'month';

interface DayItem {
  dateStr: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  dateObj: Date;
}

interface MonthGridDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  missionsCount: number;
  hasUserMission: boolean;
}

export function Planning() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString(0));
  const [weekAnchorDate, setWeekAnchorDate] = useState<string>(getTodayDateString(0));
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [contactMember, setContactMember] = useState<Profile | null>(null);

  // Filtre chef d'équipe : 'mine' (son planning), 'all' (toute l'équipe), ou ID d'un membre spécifique
  const [supervisorFilter, setSupervisorFilter] = useState<string>('mine');

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadPlanningData() {
      try {
        const [allChantiers, allAffectations, allProfiles] = await Promise.all([
          db.chantiers.toArray(),
          db.affectations.toArray(),
          db.profiles.toArray(),
        ]);
        if (isMounted) {
          setChantiers(allChantiers);
          setAffectations(allAffectations);
          setProfiles(allProfiles);
        }

        if (navigator.onLine) {
          await syncEngine.pullRemoteData();
          if (isMounted) {
            const [freshCh, freshAff, freshPr] = await Promise.all([
              db.chantiers.toArray(),
              db.affectations.toArray(),
              db.profiles.toArray(),
            ]);
            setChantiers(freshCh);
            setAffectations(freshAff);
            setProfiles(freshPr);
          }
        }
      } catch (err) {
        console.error('Erreur chargement planning:', err);
      }
    }

    loadPlanningData();
    const unsub = syncEngine.subscribe(loadPlanningData);
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Détermination du profileId ciblé pour le filtrage
  const targetFilterProfileId = useMemo(() => {
    if (!profile) return null;
    // Si rôle ouvrier : STRICTEMENT ses propres missions
    if (profile.role === 'ouvrier') return profile.id;

    // Si chef d'équipe / admin : selon le choix du filtre
    if (supervisorFilter === 'mine') return profile.id;
    if (supervisorFilter === 'all') return null; // Vue globale
    return supervisorFilter; // ID spécifique d'un ouvrier
  }, [profile, supervisorFilter]);

  // Parsing sécurisé avec ancrage midi UTC pour éviter les dérives de fuseau
  const parseMiddayUTC = useCallback((dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
  }, []);

  const formatISODate = useCallback((d: Date): string => {
    return d.toISOString().slice(0, 10);
  }, []);

  const syncMonthWithDate = useCallback((dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number);
    const today = new Date();
    const diffMonths = (y - today.getFullYear()) * 12 + (m - 1 - today.getMonth());
    setMonthOffset(diffMonths);
  }, []);

  const handleSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setWeekAnchorDate(dateStr);
    syncMonthWithDate(dateStr);
  }, [syncMonthWithDate]);

  const handleJumpToday = useCallback(() => {
    const today = getTodayDateString(0);
    setSelectedDate(today);
    setWeekAnchorDate(today);
    setMonthOffset(0);
  }, []);

  const selectedDateObj = useMemo(() => parseMiddayUTC(selectedDate), [selectedDate, parseMiddayUTC]);
  const weekAnchorDateObj = useMemo(() => parseMiddayUTC(weekAnchorDate), [weekAnchorDate, parseMiddayUTC]);

  // Calcul du lundi de la semaine affichée dans le bandeau (axée sur weekAnchorDate)
  const currentWeekMonday = useMemo(() => {
    const d = new Date(weekAnchorDateObj);
    const day = d.getUTCDay(); // 0 est Dimanche, 1 est Lundi...
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diff);
    return monday;
  }, [weekAnchorDateObj]);

  // Navigation semaines (< / >) : déplace la semaine affichée sans changer la date sélectionnée
  const handlePrevWeek = useCallback(() => {
    const prev = new Date(weekAnchorDateObj);
    prev.setUTCDate(prev.getUTCDate() - 7);
    const newAnchorStr = formatISODate(prev);
    setWeekAnchorDate(newAnchorStr);
  }, [weekAnchorDateObj, formatISODate]);

  const handleNextWeek = useCallback(() => {
    const next = new Date(weekAnchorDateObj);
    next.setUTCDate(next.getUTCDate() + 7);
    const newAnchorStr = formatISODate(next);
    setWeekAnchorDate(newAnchorStr);
  }, [weekAnchorDateObj, formatISODate]);

  // Label dynamique pour l'en-tête de semaine
  const weekLabel = useMemo(() => {
    const today = parseMiddayUTC(getTodayDateString(0));
    const todayDay = today.getUTCDay();
    const todayDiff = todayDay === 0 ? -6 : 1 - todayDay;
    const todayMonday = new Date(today);
    todayMonday.setUTCDate(today.getUTCDate() + todayDiff);

    const diffMs = currentWeekMonday.getTime() - todayMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    if (diffWeeks === 0) return 'Cette semaine';
    if (diffWeeks > 0) return `Dans +${diffWeeks} sem.`;
    return `Il y a ${Math.abs(diffWeeks)} sem.`;
  }, [currentWeekMonday, parseMiddayUTC]);

  // Génération des 7 jours de la semaine courante (axée sur selectedDate)
  const weekDays: DayItem[] = useMemo(() => {
    const days: DayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday);
      d.setUTCDate(currentWeekMonday.getUTCDate() + i);

      const dateStr = formatISODate(d);
      const dayName = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        timeZone: 'UTC',
      })
        .format(d)
        .replace('.', '')
        .toUpperCase();

      days.push({
        dateStr,
        dayNumber: d.getUTCDate(),
        dayName,
        isToday: dateStr === getTodayDateString(0),
        dateObj: d,
      });
    }
    return days;
  }, [currentWeekMonday, formatISODate]);

  // Récupération des chantiers filtrés pour une date donnée
  const getMissionsForDate = useCallback(
    (dateStr: string) => {
      // Toutes les affectations du jour
      const dayAffs = affectations.filter((a) => a.date_intervention === dateStr);

      // Si filtrage par profil (obligatoire pour ouvrier, optionnel pour chef)
      let relevantAffs = dayAffs;
      if (targetFilterProfileId) {
        relevantAffs = dayAffs.filter((a) => a.profile_id === targetFilterProfileId);
      }

      // IDs des chantiers concernés
      const chantierIds = Array.from(new Set(relevantAffs.map((a) => a.chantier_id)));

      const missions = chantierIds
        .map((id) => chantiers.find((c) => c.id === id))
        .filter((c): c is Chantier => c !== undefined);

      return missions.map((ch) => {
        // Collègues assignés sur CE chantier ce jour
        const assignedProfileIds = dayAffs
          .filter((a) => a.chantier_id === ch.id)
          .map((a) => a.profile_id);

        const assignedMembers = profiles.filter((p) => assignedProfileIds.includes(p.id));

        return {
          chantier: ch,
          assignedMembers,
          isUserAssigned: profile ? assignedProfileIds.includes(profile.id) : true,
        };
      });
    },
    [affectations, chantiers, profiles, profile, targetFilterProfileId]
  );

  const currentDayMissions = useMemo(() => {
    return getMissionsForDate(selectedDate);
  }, [selectedDate, getMissionsForDate]);

  const selectedDayLabel = useMemo(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(selectedDateObj);
  }, [selectedDateObj]);

  // Date du mois affiché (en mode mois)
  const currentMonthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const currentMonthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
    }).format(currentMonthDate);
  }, [currentMonthDate]);

  // Grille du mois pour le calendrier
  const monthGridDays: MonthGridDay[] = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Jour de la semaine du 1er du mois (Lundi = 0, ..., Dimanche = 6)
    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: MonthGridDay[] = [];

    // Jours du mois précédent pour combler la première semaine
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(prevDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const missions = getMissionsForDate(dateStr);
      days.push({
        dateStr,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === getTodayDateString(0),
        isSelected: dateStr === selectedDate,
        missionsCount: missions.length,
        hasUserMission: missions.some((m) => m.isUserAssigned),
      });
    }

    // Jours du mois courant
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const missions = getMissionsForDate(dStr);
      days.push({
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dStr === getTodayDateString(0),
        isSelected: dStr === selectedDate,
        missionsCount: missions.length,
        hasUserMission: missions.some((m) => m.isUserAssigned),
      });
    }

    // Jours du mois suivant pour compléter la grille jusqu'à un multiple de 7
    const remainder = days.length % 7;
    if (remainder > 0) {
      const fillCount = 7 - remainder;
      for (let i = 1; i <= fillCount; i++) {
        const nextDate = new Date(year, month + 1, i);
        const y = nextDate.getFullYear();
        const m = String(nextDate.getMonth() + 1).padStart(2, '0');
        const d = String(nextDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const missions = getMissionsForDate(dateStr);
        days.push({
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateStr === getTodayDateString(0),
          isSelected: dateStr === selectedDate,
          missionsCount: missions.length,
          hasUserMission: missions.some((m) => m.isUserAssigned),
        });
      }
    }

    return days;
  }, [currentMonthDate, getMissionsForDate, selectedDate]);

  return (
    <div className="space-y-4">
      {/* En-tête & Toggle à 3 états (Jour | Semaine | Mois) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-foret">Planning</h1>
          <p className="text-xs text-sauge">
            {profile?.role === 'ouvrier'
              ? 'Vos missions personnelles planifiées'
              : "Missions et planning d'équipe"}
          </p>
        </div>

        {/* Toggle Vue à 3 états avec cibles tactiles outdoor >= 48px */}
        <div className="flex bg-sable/60 p-1 rounded-2xl text-xs font-semibold text-foret/80 self-start sm:self-auto shadow-xs border border-sable/50">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`min-h-[48px] min-w-[64px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center font-bold active:scale-95 ${
              viewMode === 'day'
                ? 'bg-white text-foret shadow-xs'
                : 'hover:text-foret text-foret/70'
            }`}
          >
            Jour
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`min-h-[48px] min-w-[72px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center font-bold active:scale-95 ${
              viewMode === 'week'
                ? 'bg-white text-foret shadow-xs'
                : 'hover:text-foret text-foret/70'
            }`}
          >
            Semaine
          </button>
          <button
            type="button"
            onClick={() => {
              syncMonthWithDate(selectedDate);
              setViewMode('month');
            }}
            className={`min-h-[48px] min-w-[64px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center font-bold active:scale-95 ${
              viewMode === 'month'
                ? 'bg-white text-foret shadow-xs'
                : 'hover:text-foret text-foret/70'
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* Sélecteur de supervision pour Chef d'équipe & Admin */}
      {(profile?.role === 'chef_equipe' || profile?.role === 'admin') && (
        <div className="bg-white rounded-2xl p-3 border border-sable/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sauge uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Vue du planning
            </span>
            <span className="text-[11px] text-foret/60">Filtrer par équipier</span>
          </div>

          <div className="flex gap-2">
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              className="w-full min-h-[48px] text-xs font-bold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20 appearance-none pr-8 cursor-pointer"
            >
              <option value="mine">👤 Mon planning personnel ({profile.prenom} {profile.nom})</option>
              <option value="all">👥 Toute l'équipe (Vue globale chantiers)</option>
              <optgroup label="Planning individuel par ouvrier">
                {profiles
                  .filter((p) => p.id !== profile.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Planning de : {p.prenom} {p.nom} ({p.role === 'chef_equipe' ? 'Chef' : 'Ouvrier'})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      {/* Navigation et Sélecteurs temporels selon le mode */}
      {viewMode === 'day' && (
        <>
          {/* Navigation entre semaines avec bouton Aujourd'hui dédié */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-sable/70 shadow-xs">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-foret capitalize flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-terracotta" />
              {weekLabel}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleJumpToday}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                  selectedDate === getTodayDateString(0) && weekAnchorDate === getTodayDateString(0)
                    ? 'bg-craie text-foret/40 border-sable/50'
                    : 'bg-sable/80 hover:bg-sable text-foret border-sable shadow-2xs font-extrabold'
                }`}
                title="Revenir à aujourd'hui"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Semaine suivante"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bandeau de jours Lun - Dim avec cibles tactiles >= 48px */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-1">
            {weekDays.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => {
                    handleSelectDate(day.dateStr);
                  }}
                  className={`flex-1 min-w-[48px] min-h-[52px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-foret text-sable shadow-md scale-105'
                      : day.isToday
                        ? 'bg-terracotta/15 border border-terracotta/40 text-terracotta'
                        : 'bg-white hover:bg-sable/40 text-foret/80 border border-sable/70'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider ${isSelected ? 'text-sauge' : ''}`}>
                    {day.dayName}
                  </span>
                  <span className="text-sm font-extrabold mt-0.5">{day.dayNumber}</span>
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-terracotta mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Structured Day Schedule with Assigned Chantiers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-sauge capitalize">
                {selectedDayLabel}
              </h2>
              <span className="text-xs font-semibold text-foret/60">
                {currentDayMissions.length} chantier(s) prévu(s)
              </span>
            </div>

            {currentDayMissions.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 border border-sable/70 text-center space-y-2 shadow-soft">
                <CalendarDays className="w-8 h-8 mx-auto text-sauge/50" />
                <p className="text-sm font-bold text-foret">
                  {profile?.role === 'ouvrier' || targetFilterProfileId
                    ? 'Aucune intervention prévue pour cette journée'
                    : "Aucun chantier d'équipe planifié ce jour"}
                </p>
                <p className="text-xs text-sauge">
                  {profile?.role === 'ouvrier'
                    ? 'Vous êtes en repos ou en attente d’affectation par votre chef d’équipe.'
                    : 'Aucun chantier ni ouvrier affecté à cette date.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentDayMissions.map(({ chantier, assignedMembers, isUserAssigned }) => (
                  <div
                    key={chantier.id}
                    className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-4 hover:border-sauge transition-all"
                  >
                    {/* En-tête : Nom du chantier & Badge de statut */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base sm:text-lg text-foret leading-snug">
                            {chantier.nom_client}
                          </h3>
                          {isUserAssigned && (
                            <span className="text-[10px] font-bold text-foret bg-sable px-2.5 py-0.5 rounded-full">
                              Votre mission
                            </span>
                          )}
                        </div>
                        {chantier.description && (
                          <p className="text-xs text-foret/70 line-clamp-2 mt-1">
                            {chantier.description}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                          chantier.statut === 'en_cours'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-craie text-foret border-sable'
                        }`}
                      >
                        {chantier.statut === 'en_cours' ? 'En cours' : 'Planifié'}
                      </span>
                    </div>

                    {/* Adresse complète avec icône de navigation GPS cliquable */}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(chantier.adresse)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[48px] flex items-center gap-2.5 text-xs text-foret/80 hover:text-terracotta bg-craie p-3 rounded-2xl border border-sable/60 active:scale-[0.99] transition-all group"
                      title="Ouvrir l'adresse dans Google Maps"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white border border-sable flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <MapPin className="w-4 h-4 text-terracotta" />
                      </div>
                      <span className="truncate font-medium text-foret flex-1">
                        {chantier.adresse}
                      </span>
                      <ExternalLink className="w-4 h-4 text-foret/40 group-hover:text-terracotta shrink-0" />
                    </a>

                    {/* Équipiers assignés travaillant ensemble sur ce chantier */}
                    <div className="space-y-2 pt-1 border-t border-sable/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sauge uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-foret" />
                          Équipe sur place ({assignedMembers.length})
                        </span>
                        {assignedMembers.length > 0 && (
                          <span className="text-[11px] text-foret/60 font-medium">
                            Ensemble sur ce chantier
                          </span>
                        )}
                      </div>

                      {assignedMembers.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {assignedMembers.map((m) => {
                            const isCurrentUser = profile?.id === m.id;
                            const initials = `${m.prenom.charAt(0)}${m.nom.charAt(0)}`.toUpperCase();
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setContactMember(m)}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[40px] rounded-2xl border shadow-2xs transition-all cursor-pointer active:scale-95 text-left ${
                                  isCurrentUser
                                    ? 'bg-foret text-white border-foret ring-1 ring-sauge/40'
                                    : 'bg-craie hover:bg-white text-foret border-sable/80 hover:border-sauge'
                                }`}
                                title={`Contacter ${m.prenom} ${m.nom}`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    isCurrentUser
                                      ? 'bg-sable text-foret'
                                      : 'bg-foret text-sable'
                                  }`}
                                >
                                  {initials}
                                </div>
                                <div className="flex items-center gap-1.5 leading-none">
                                  <span className="text-xs font-bold">
                                    {m.prenom} {isCurrentUser && '(Vous)'}
                                  </span>
                                  {m.role === 'chef_equipe' && (
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isCurrentUser
                                          ? 'bg-white/20 text-sable'
                                          : 'bg-sauge/20 text-foret'
                                      }`}
                                    >
                                      Chef
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-foret/50 italic">
                          Aucun équipier spécifiquement affecté.
                        </p>
                      )}
                    </div>

                    {/* Lien direct / Bouton "Consulter la fiche détaillée" */}
                    <div className="pt-2 border-t border-sable/40 flex justify-end">
                      <Link
                        to={`/chantier/${chantier.id}`}
                        className="min-h-[48px] px-4 py-2 bg-craie hover:bg-white text-foret hover:text-terracotta border border-sable/80 hover:border-sauge font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-2xs transition-all active:scale-95"
                      >
                        <span>Consulter la fiche détaillée</span>
                        <ArrowRightIcon className="w-4 h-4 text-terracotta" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Contenu : Vue Semaine */}
      {viewMode === 'week' && (
        <div className="space-y-3">
          {/* Navigation entre semaines avec bouton Aujourd'hui dédié */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-sable/70 shadow-xs">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-foret capitalize flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-terracotta" />
              {weekLabel}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleJumpToday}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                  selectedDate === getTodayDateString(0) && weekAnchorDate === getTodayDateString(0)
                    ? 'bg-craie text-foret/40 border-sable/50'
                    : 'bg-sable/80 hover:bg-sable text-foret border-sable shadow-2xs font-extrabold'
                }`}
                title="Revenir à aujourd'hui"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Semaine suivante"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {weekDays.map((day) => {
            const missions = getMissionsForDate(day.dateStr);
            return (
              <div
                key={day.dateStr}
                onClick={() => {
                  handleSelectDate(day.dateStr);
                  setViewMode('day');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  day.isToday
                    ? 'bg-white border-terracotta/40 shadow-xs ring-1 ring-terracotta/20'
                    : 'bg-white border-sable/70 hover:border-sauge'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foret">
                      {day.dayName} {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-terracotta text-white">
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-sauge font-medium">
                    {missions.length} mission(s)
                  </span>
                </div>

                {missions.length === 0 ? (
                  <p className="text-xs text-foret/40 italic">Aucune intervention</p>
                ) : (
                  <div className="space-y-1.5">
                    {missions.map(({ chantier, isUserAssigned }) => (
                      <div
                        key={chantier.id}
                        className="text-xs font-semibold text-foret bg-craie p-2.5 rounded-xl flex items-center justify-between border border-sable/50"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{chantier.nom_client}</span>
                          {isUserAssigned && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sable text-foret shrink-0">
                              Moi
                            </span>
                          )}
                        </div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contenu : Vue Mois (Calendrier & Grille d'ensemble) */}
      {viewMode === 'month' && (
        <div className="space-y-3">
          {/* Barre de navigation mensuelle avec bouton Aujourd'hui dédié */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-sable/70 shadow-xs">
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev - 1)}
              className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Mois précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-foret capitalize flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-terracotta" />
              {currentMonthLabel}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleJumpToday}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                  monthOffset === 0 && selectedDate === getTodayDateString(0)
                    ? 'bg-craie text-foret/40 border-sable/50'
                    : 'bg-sable/80 hover:bg-sable text-foret border-sable shadow-2xs font-extrabold'
                }`}
                title="Revenir à aujourd'hui"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset((prev) => prev + 1)}
                className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Mois suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendrier Mensuel */}
          <div className="bg-white rounded-3xl p-4 border border-sable/80 shadow-xs space-y-2">
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-sauge pb-2 border-b border-sable/60">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mer</span>
              <span>Jeu</span>
              <span>Ven</span>
              <span>Sam</span>
              <span>Dim</span>
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-1">
              {monthGridDays.map((day) => {
                const isSelected = day.dateStr === selectedDate;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => {
                      handleSelectDate(day.dateStr);
                    }}
                    className={`min-h-[48px] p-1 rounded-xl flex flex-col items-center justify-between text-xs transition-all cursor-pointer active:scale-95 border ${
                      isSelected
                        ? 'bg-foret text-sable border-foret shadow-xs font-bold'
                        : day.isToday
                          ? 'bg-terracotta/10 border-terracotta/40 text-terracotta font-extrabold'
                          : day.isCurrentMonth
                            ? 'bg-craie border-sable/50 text-foret/80 hover:bg-sable/30'
                            : 'bg-white/40 border-transparent text-foret/30'
                    }`}
                  >
                    <span className="text-[11px]">{day.dayNumber}</span>

                    {/* Indicateur de missions du jour */}
                    <div className="flex items-center justify-center gap-0.5 h-2">
                      {day.missionsCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            day.hasUserMission
                              ? isSelected
                                ? 'bg-sauge'
                                : 'bg-emerald-600'
                              : isSelected
                                ? 'bg-sable'
                                : 'bg-terracotta'
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Résumé du jour sélectionné dans la vue mois */}
          <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sauge block capitalize">
                  {selectedDayLabel}
                </span>
                <span className="text-xs font-bold text-foret">
                  {currentDayMissions.length} chantier(s) programmé(s)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('day')}
                className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-foret text-white text-xs font-bold hover:bg-foret/90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-sauge" />
                <span>Voir le déroulé</span>
              </button>
            </div>

            {currentDayMissions.length === 0 ? (
              <p className="text-xs text-foret/50 italic py-1">
                Aucune intervention programmée pour ce jour.
              </p>
            ) : (
              <div className="space-y-1.5">
                {currentDayMissions.map(({ chantier, assignedMembers }) => (
                  <div
                    key={chantier.id}
                    className="p-2.5 rounded-xl bg-craie border border-sable/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-foret">{chantier.nom_client}</p>
                      <p className="text-[11px] text-foret/60 truncate max-w-[200px]">
                        {chantier.adresse}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-sauge">
                      {assignedMembers.length} équipier(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Quick Contact pour les équipiers */}
      {contactMember && (
        <div
          className="fixed inset-0 bg-foret/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setContactMember(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 border border-sable/80 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Poignée pour mobile bottom sheet */}
            <div className="w-12 h-1 bg-sable rounded-full mx-auto sm:hidden" />

            {/* En-tête modal avec avatar & coordonnées */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-foret text-sable text-base font-black flex items-center justify-center shrink-0 shadow-2xs">
                  {contactMember.prenom.charAt(0).toUpperCase()}
                  {contactMember.nom.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 id="contact-modal-title" className="text-base font-extrabold text-foret leading-tight">
                    {contactMember.prenom} {contactMember.nom}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-bold text-sauge uppercase tracking-wider">
                      {contactMember.role === 'chef_equipe'
                        ? "Chef d'équipe"
                        : contactMember.role === 'admin'
                          ? 'Direction'
                          : 'Ouvrier paysagiste'}
                    </span>
                    {contactMember.id === profile?.id && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sable text-foret">
                        Vous
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setContactMember(null)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl hover:bg-craie text-foret/60 hover:text-foret flex items-center justify-center transition-all cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Numéro de téléphone & Email */}
            <div className="bg-craie p-3 rounded-2xl border border-sable/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foret/60 font-medium">Téléphone :</span>
                <span className="font-bold text-foret font-mono">
                  {contactMember.telephone || 'Non renseigné'}
                </span>
              </div>
              {contactMember.email && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foret/60 font-medium">Email :</span>
                  <span className="font-semibold text-foret/80 truncate max-w-[200px]">
                    {contactMember.email}
                  </span>
                </div>
              )}
            </div>

            {/* Actions rapides : Message & Téléphone */}
            {contactMember.telephone ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href={`sms:${contactMember.telephone.replace(/\s+/g, '')}`}
                  className="min-h-[48px] px-4 py-3 bg-foret hover:bg-foret/90 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-sauge" />
                  <span>Message</span>
                </a>

                <a
                  href={`tel:${contactMember.telephone.replace(/\s+/g, '')}`}
                  className="min-h-[48px] px-4 py-3 bg-terracotta hover:bg-terracotta/90 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-white" />
                  <span>Téléphone</span>
                </a>
              </div>
            ) : (
              <div className="p-3 bg-craie rounded-2xl border border-sable/60 text-center text-xs text-foret/60 italic">
                Aucun numéro de téléphone renseigné pour cet équipier.
              </div>
            )}

            {/* Bouton Annuler / Fermer */}
            <button
              type="button"
              onClick={() => setContactMember(null)}
              className="w-full min-h-[44px] py-2.5 rounded-2xl bg-white hover:bg-craie text-foret/70 hover:text-foret border border-sable font-bold text-xs transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
