import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { db, getTodayDateString } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { getQuickGeolocation } from '../lib/geolocation';
import { fetchChantierWeather, type WeatherInfo } from '../lib/weather';
import type { Chantier, PointageLocal, PointageType, Profile } from '../types/database';
import {
  MapPin,
  Clock,
  Play,
  Coffee,
  LogOut,
  LogIn,
  RotateCcw,
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
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamMemberStatus {
  profile: Profile;
  lastPointage?: PointageLocal;
  status: 'en_poste' | 'en_pause' | 'parti' | 'non_pointe';
  workedSeconds: number;
  chantierName?: string;
}

export function Home() {
  const { profile } = useAuth();
  const [allChantiers, setAllChantiers] = useState<Chantier[]>([]);
  const [assignedChantiers, setAssignedChantiers] = useState<Chantier[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null);
  const [todayPointages, setTodayPointages] = useState<PointageLocal[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Données de supervision pour chef d'équipe
  const [teamStatuses, setTeamStatuses] = useState<TeamMemberStatus[]>([]);

  const todayStr = useMemo(() => getTodayDateString(0), []);

  // Horloge en direct
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);  // Chargement des données du jour (chantiers, affectations et pointages)
  const refreshData = useCallback(async () => {
    if (!profile) return;
    try {
      const [chantiersData, myAffsData, userPointagesData, allProfilesData, allPointagesData] =
        await Promise.all([
          db.chantiers.toArray(),
          db.affectations.where({ profile_id: profile.id, date_intervention: todayStr }).toArray(),
          db.pointages.where('profile_id').equals(profile.id).toArray(),
          db.profiles.toArray(),
          db.pointages.toArray(),
        ]);

      setAllChantiers(chantiersData);

      // Chantiers affectés pour ce profil aujourd'hui
      const myChantierIds = myAffsData.map((a) => a.chantier_id);
      const myChantiers = chantiersData.filter((c) => myChantierIds.includes(c.id));
      setAssignedChantiers(myChantiers);

      // Sélection automatique du chantier
      if (profile.role === 'ouvrier') {
        setSelectedChantier(myChantiers[0] || null);
      } else {
        // Chef d'équipe / admin : chantier affecté ou premier chantier actif
        const defaultCh = myChantiers[0] || chantiersData[0] || null;
        setSelectedChantier((prev) => prev || defaultCh);
      }

      // Pointages personnels du jour (dédoublonnés pour éviter doublon local/distant)
      const seenTimeKeys = new Set<string>();
      const filtered = userPointagesData
        .filter((pt) => pt.horodatage.startsWith(todayStr))
        .sort((a, b) => new Date(a.horodatage).getTime() - new Date(b.horodatage).getTime())
        .filter((pt) => {
          const timeMinute = pt.horodatage.substring(0, 16); // Précision à la minute
          const key = `${pt.type}-${timeMinute}`;
          if (seenTimeKeys.has(key)) return false;
          seenTimeKeys.add(key);
          return true;
        });
      setTodayPointages(filtered);

      // Pour les chefs d'équipe : calculer le statut de toute l'équipe
      if (profile.role === 'chef_equipe' || profile.role === 'admin') {
        const workers = allProfilesData.filter((p) => p.id !== profile.id);
        const statuses: TeamMemberStatus[] = workers.map((w) => {
          const wPts = allPointagesData
            .filter((pt) => pt.profile_id === w.id && pt.horodatage.startsWith(todayStr))
            .sort((a, b) => new Date(a.horodatage).getTime() - new Date(b.horodatage).getTime());

          const last = wPts[wPts.length - 1];
          let status: TeamMemberStatus['status'] = 'non_pointe';
          if (last) {
            if (last.type === 'arrivee' || last.type === 'reprise') status = 'en_poste';
            else if (last.type === 'pause') status = 'en_pause';
            else if (last.type === 'depart') status = 'parti';
          }

          // Calcul des heures
          let sec = 0;
          let pStart: number | null = null;
          wPts.forEach((pt) => {
            const t = new Date(pt.horodatage).getTime();
            if (pt.type === 'arrivee' || pt.type === 'reprise') pStart = t;
            else if (pt.type === 'pause' || pt.type === 'depart') {
              if (pStart !== null) {
                sec += Math.max(0, Math.floor((t - pStart) / 1000));
                pStart = null;
              }
            }
          });
          if (pStart !== null) {
            sec += Math.max(0, Math.floor((Date.now() - pStart) / 1000));
          }

          const ch = last?.chantier_id
            ? chantiersData.find((c) => c.id === last.chantier_id)
            : undefined;

          return {
            profile: w,
            lastPointage: last,
            status,
            workedSeconds: sec,
            chantierName: ch?.nom_client,
          };
        });
        setTeamStatuses(statuses);
      }
    } catch (err) {
      console.error('Erreur chargement données Home:', err);
    }
  }, [profile, todayStr]);

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

  // Détermination du dernier pointage personnel
  const lastPointage = todayPointages[todayPointages.length - 1];
  const lastType: PointageType | null = lastPointage ? lastPointage.type : null;

  // Calcul dynamique des heures travaillées (supporte pauses multiples)
  const totalWorkedSeconds = useMemo(() => {
    let seconds = 0;
    let periodStart: number | null = null;

    todayPointages.forEach((pt) => {
      const time = new Date(pt.horodatage).getTime();
      if (pt.type === 'arrivee' || pt.type === 'reprise') {
        periodStart = time;
      } else if (pt.type === 'pause' || pt.type === 'depart') {
        if (periodStart !== null) {
          seconds += Math.max(0, Math.floor((time - periodStart) / 1000));
          periodStart = null;
        }
      }
    });

    // Si actuellement au travail (Arrivée ou Reprise en cours)
    if (periodStart !== null) {
      const now = currentTime.getTime();
      seconds += Math.max(0, Math.floor((now - periodStart) / 1000));
    }

    return seconds;
  }, [todayPointages, currentTime]);

  const formatHoursMinutes = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    return `${hrs}h${String(mins).padStart(2, '0')}`;
  };

  // Progression sur 8h
  const progressPercent = Math.min(100, Math.round((totalWorkedSeconds / 28800) * 100));

  // Exécution du pointage
  const handlePointage = async (targetType: PointageType) => {
    if (!profile || !selectedChantier || isProcessing) return;

    setIsProcessing(true);
    setGpsStatusText('Recherche coordonnées GPS...');

    try {
      const geo = await getQuickGeolocation(2500);
      setGpsStatusText(geo.latitude ? 'Position GPS validée' : 'Enregistré (GPS hors portée)');

      await syncEngine.addPointage({
        profile_id: profile.id,
        chantier_id: selectedChantier.id,
        type: targetType,
        horodatage: new Date().toISOString(),
        latitude: geo.latitude,
        longitude: geo.longitude,
      });

      await refreshData();
    } catch (err) {
      console.error('Erreur lors du pointage:', err);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setGpsStatusText(null);
      }, 500);
    }
  };

  const formattedToday = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(currentTime);

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
            {weather.iconName === 'sun' && <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />}
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
              Veuillez contacter votre chef d'équipe pour être assigné à une mission.
            </p>
          </div>
        ) : (
          <>
            {/* Si plusieurs chantiers affectés, sélecteur rapide */}
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

      {/* 3. Compteur d'heures dynamiques du jour (Objectif 8h) */}
      <div className="bg-foret text-sable rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sable">
              <Timer className="w-4 h-4 text-terracotta" />
            </div>
            <div>
              <span className="text-[11px] text-sable/70 uppercase tracking-wider block leading-none">
                Cumul de la journée
              </span>
              <span className="text-xl font-extrabold text-white">
                {formatHoursMinutes(totalWorkedSeconds)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-sable/70 block">Objectif</span>
            <span className="text-sm font-bold text-sable">8h00 ({progressPercent}%)</span>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-terracotta h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {lastType && (
          <div className="text-[11px] text-sable/80 flex items-center justify-between pt-0.5">
            <span>État actuel :</span>
            <span className="font-semibold text-white uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
              {(lastType === 'arrivee' || lastType === 'reprise') && '🟢 Au travail'}
              {lastType === 'pause' && '☕ En pause'}
              {lastType === 'depart' && '🏁 Journée terminée'}
            </span>
          </div>
        )}
      </div>

      {/* 4. Moteur de pointage contextuel & souple (pauses multiples et départ direct) */}
      <div className="space-y-2.5">
        {/* Horloge précise en direct pour le pointage */}
        <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-sable/90 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-foret/75 font-semibold">
            <Clock className="w-3.5 h-3.5 text-terracotta" />
            <span>Heure actuelle</span>
          </div>
          <div className="font-mono text-sm font-extrabold text-foret tracking-wider bg-craie px-2.5 py-0.5 rounded-lg border border-sable flex items-center gap-1">
            <span>
              {currentTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        </div>

        {gpsStatusText && (
          <p className="text-center text-xs font-semibold text-terracotta animate-pulse">
            {gpsStatusText}
          </p>
        )}

        {/* Cas 1 : Journée non commencée ou relance après départ */}
        {(!lastPointage || lastType === 'depart') && (
          <button
            type="button"
            onClick={() => handlePointage('arrivee')}
            disabled={isProcessing || !selectedChantier}
            className="w-full py-4 px-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg transition-all active:scale-97 cursor-pointer disabled:opacity-50 bg-terracotta hover:bg-terracotta/90 text-white shadow-terracotta/25"
          >
            <div className="flex items-center gap-2 text-base">
              <LogIn className={`w-5 h-5 ${isProcessing ? 'animate-bounce' : ''}`} />
              <span>Pointer mon Arrivée</span>
            </div>
            <span className="text-xs opacity-85 font-normal">
              {selectedChantier
                ? `Prise de poste : ${selectedChantier.nom_client.substring(0, 24)}...`
                : 'Sélectionnez un chantier'}
            </span>
          </button>
        )}

        {/* Cas 2 : Actuellement au travail (Arrivée ou Reprise) -> Deux choix possibles ! */}
        {(lastType === 'arrivee' || lastType === 'reprise') && (
          <div className="space-y-2">
            {/* Action A : Prendre une pause (Pause café, déjeuner, pause de l'après-midi...) */}
            <button
              type="button"
              onClick={() => handlePointage('pause')}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 bg-foret hover:bg-foret/90 text-sable font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-97 cursor-pointer disabled:opacity-50"
            >
              <Coffee className="w-5 h-5 text-terracotta" />
              <span>Prendre une Pause</span>
            </button>

            {/* Action B : Fin de journée directe (sans pause obligatoire !) */}
            <button
              type="button"
              onClick={() => handlePointage('depart')}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-amber-700/90 hover:bg-amber-800 active:scale-97 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Fin de journée (Départ)</span>
            </button>
          </div>
        )}

        {/* Cas 3 : Actuellement en pause -> Reprendre le travail */}
        {lastType === 'pause' && (
          <button
            type="button"
            onClick={() => handlePointage('reprise')}
            disabled={isProcessing}
            className="w-full py-4 px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-700/25 transition-all active:scale-97 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              <span>Reprendre le Travail</span>
            </div>
            <span className="text-xs opacity-85 font-normal">Fin de la pause en cours</span>
          </button>
        )}

        {/* Si journée clôturée, proposer le redémarrage pour un autre chantier */}
        {lastType === 'depart' && (
          <button
            type="button"
            onClick={() => handlePointage('arrivee')}
            disabled={isProcessing}
            className="w-full py-2.5 px-3 bg-craie hover:bg-sable/50 border border-sable text-foret font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-terracotta" />
            <span>Nouveau pointage / intervention (Multi-chantier)</span>
          </button>
        )}
      </div>

      {/* 5. Espace Superviseur : Suivi des pointages de l'équipe (visible uniquement pour Chef d'équipe & Admin) */}
      {(profile?.role === 'chef_equipe' || profile?.role === 'admin') && (
        <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Suivi de l'équipe (Aujourd'hui)
            </span>
            <span className="text-xs text-foret/60">{teamStatuses.length} ouvrier(s)</span>
          </div>

          <div className="divide-y divide-sable/50">
            {teamStatuses.map((m) => (
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
                      {m.chantierName || 'Aucun chantier'}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'en_poste'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'en_pause'
                          ? 'bg-amber-100 text-amber-800'
                          : m.status === 'parti'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-sable/60 text-foret/60'
                      }`}
                  >
                    {m.status === 'en_poste' && '🟢 Au travail'}
                    {m.status === 'en_pause' && '☕ En pause'}
                    {m.status === 'parti' && '🏁 Parti'}
                    {m.status === 'non_pointe' && '⚪ Non pointé'}
                  </span>
                  <p className="text-[10px] font-semibold text-foret/70">
                    {formatHoursMinutes(m.workedSeconds)}
                  </p>
                </div>
              </div>
            ))}
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

      {/* 6. Récapitulatif chronologique des pointages du jour */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-foret" />
            Mes pointages du jour
          </h2>
          <span className="text-xs text-foret/60">{todayPointages.length} saisie(s)</span>
        </div>

        {todayPointages.length === 0 ? (
          <div className="text-center py-6 text-xs text-foret/50 space-y-1">
            <AlertCircle className="w-6 h-6 mx-auto text-sauge/60" />
            <p>Aucun pointage enregistré aujourd'hui.</p>
            <p className="text-[11px] text-sauge">
              Appuyez sur "Pointer mon Arrivée" dès votre prise de poste.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayPointages.map((pt) => {
              const timeStr = new Date(pt.horodatage).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const getBadge = (t: PointageType) => {
                switch (t) {
                  case 'arrivee':
                    return { label: 'Arrivée', color: 'bg-emerald-100 text-emerald-800' };
                  case 'pause':
                    return { label: 'Pause', color: 'bg-amber-100 text-amber-800' };
                  case 'reprise':
                    return { label: 'Reprise', color: 'bg-sky-100 text-sky-800' };
                  case 'depart':
                    return { label: 'Départ', color: 'bg-rose-100 text-rose-800' };
                }
              };

              const badge = getBadge(pt.type);

              return (
                <div
                  key={pt.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-craie border border-sable/50 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="font-bold text-foret">{timeStr}</span>
                    {pt.latitude && (
                      <span className="text-[10px] text-sauge flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5 text-terracotta" />
                        GPS
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {pt.synced ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden xs:inline">Synchro</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                        <CloudUpload className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>En attente</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
