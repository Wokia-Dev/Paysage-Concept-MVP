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
  Clock,
  Users,
  ExternalLink,
  ChevronRight as ArrowRightIcon,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DayItem {
  dateStr: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  dateObj: Date;
}

export function Planning() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString(0));
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filtre chef d'équipe : 'mine' (son planning), 'all' (toute l'équipe), ou ID d'un membre spécifique
  const [supervisorFilter, setSupervisorFilter] = useState<string>('mine');

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Horloge discrète
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Génération des 7 jours de la semaine courante
  const weekDays: DayItem[] = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDiff + weekOffset * 7);

    const days: DayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
        .format(d)
        .replace('.', '')
        .toUpperCase();

      days.push({
        dateStr,
        dayNumber: d.getDate(),
        dayName,
        isToday: dateStr === getTodayDateString(0),
        dateObj: d,
      });
    }
    return days;
  }, [weekOffset]);

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
    const d = new Date(selectedDate);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  }, [selectedDate]);

  const formattedCurrentTime = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      {/* En-tête avec heure discrète & Toggle Semaine / Jour */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-foret">Planning</h1>
            <span className="text-[11px] font-mono text-sauge bg-craie px-2 py-0.5 rounded-md border border-sable/70">
              {formattedCurrentTime}
            </span>
          </div>
          <p className="text-xs text-sauge">
            {profile?.role === 'ouvrier'
              ? 'Vos missions personnelles planifiées'
              : "Missions et planning d'équipe"}
          </p>
        </div>

        {/* Toggle Vue */}
        <div className="flex bg-sable/60 p-1 rounded-xl text-xs font-semibold text-foret/80">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${viewMode === 'day' ? 'bg-white text-foret shadow-xs' : 'hover:text-foret'
              }`}
          >
            Jour
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${viewMode === 'week' ? 'bg-white text-foret shadow-xs' : 'hover:text-foret'
              }`}
          >
            Semaine
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
              className="w-full text-xs font-bold text-foret bg-craie rounded-xl p-2 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20 appearance-none pr-8 cursor-pointer"
            >
              <option value="mine">👤 Mon planning personnel (Marc Vasseur)</option>
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

      {/* Navigation entre semaines */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-2.5 border border-sable/70 shadow-xs">
        <button
          type="button"
          onClick={() => setWeekOffset((prev) => prev - 1)}
          className="p-1.5 rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer"
          title="Semaine précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-foret capitalize flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-terracotta" />
          {weekOffset === 0
            ? 'Cette semaine'
            : weekOffset > 0
              ? `Dans +${weekOffset} sem.`
              : `Il y a ${Math.abs(weekOffset)} sem.`}
        </span>

        <button
          type="button"
          onClick={() => setWeekOffset((prev) => prev + 1)}
          className="p-1.5 rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer"
          title="Semaine suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Bandeau de jours Lun - Dim */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-1">
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => {
                setSelectedDate(day.dateStr);
                setViewMode('day');
              }}
              className={`flex-1 min-w-[44px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${isSelected
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

      {/* Contenu selon le mode : Vue Jour */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sauge capitalize">
              {selectedDayLabel}
            </h2>
            <span className="text-xs font-semibold text-foret/60">
              {currentDayMissions.length} chantier(s)
            </span>
          </div>

          {currentDayMissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-sable/70 text-center space-y-2">
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
            currentDayMissions.map(({ chantier, assignedMembers, isUserAssigned }) => (
              <div
                key={chantier.id}
                className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3 hover:border-sauge transition-all"
              >
                {/* Statut & Heures */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {chantier.statut === 'en_cours' ? 'En cours' : 'Prévu'}
                    </span>
                    {isUserAssigned && (
                      <span className="text-[10px] font-semibold text-foret bg-sable px-2 py-0.5 rounded-full">
                        Votre mission
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-foret/70 font-medium">
                    <Clock className="w-3.5 h-3.5 text-terracotta" />
                    <span>08:00 - 17:00</span>
                  </div>
                </div>

                {/* Titre & Description */}
                <div>
                  <h3 className="font-extrabold text-sm text-foret leading-snug">
                    {chantier.nom_client}
                  </h3>
                  <p className="text-xs text-foret/70 line-clamp-2 mt-1">
                    {chantier.description}
                  </p>
                </div>

                {/* Adresse cliquable GPS */}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(chantier.adresse)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-xs text-foret/80 hover:text-terracotta group bg-craie p-2 rounded-xl border border-sable/50"
                >
                  <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="truncate">{chantier.adresse}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto shrink-0 text-foret/40 group-hover:text-terracotta" />
                </a>

                {/* Équipe assignée */}
                <div className="flex items-center justify-between pt-1 border-t border-sable/50">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sauge" />
                    <span className="text-[11px] font-semibold text-foret/70">
                      Équipe ({assignedMembers.length}) :
                    </span>
                    <div className="flex -space-x-1.5">
                      {assignedMembers.map((m) => (
                        <div
                          key={m.id}
                          className="w-6 h-6 rounded-full bg-foret text-sable text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs"
                          title={`${m.prenom} ${m.nom} (${m.role})`}
                        >
                          {m.prenom.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={`/chantier/${chantier.id}`}
                    className="text-xs font-bold text-terracotta hover:underline flex items-center gap-0.5"
                  >
                    <span>Détails</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Contenu : Vue Semaine */}
      {viewMode === 'week' && (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const missions = getMissionsForDate(day.dateStr);
            return (
              <div
                key={day.dateStr}
                onClick={() => {
                  setSelectedDate(day.dateStr);
                  setViewMode('day');
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${day.isToday
                    ? 'bg-white border-terracotta/40 shadow-xs'
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
                  <div className="space-y-1">
                    {missions.map(({ chantier }) => (
                      <div
                        key={chantier.id}
                        className="text-xs font-semibold text-foret bg-craie p-2 rounded-lg flex items-center justify-between"
                      >
                        <span className="truncate">{chantier.nom_client}</span>
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
    </div>
  );
}
