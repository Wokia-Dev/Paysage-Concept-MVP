import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, getTodayDateString } from '../lib/db';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import type { Chantier, Profile, Affectation, ChantierStatut } from '../types/database';
import {
  MapPin,
  Phone,
  Navigation,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Users,
  Plus,
  Check,
  CheckCircle2,
  Briefcase
} from 'lucide-react';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ChantierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isOnline } = useAuth();

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [targetDate, setTargetDate] = useState<string>(getTodayDateString(0));
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isSupervisor = profile?.role === 'chef_equipe' || profile?.role === 'admin';

  const refreshChantierData = async () => {
    if (!id) return;
    try {
      const [found, allAffs, allProfs] = await Promise.all([
        db.chantiers.get(id),
        db.affectations.where('chantier_id').equals(id).toArray(),
        db.profiles.toArray(),
      ]);

      if (found) {
        setChantier(found);
        setAffectations(allAffs);
        setAllProfiles(allProfs);

        const dayAffs = allAffs.filter((a) => a.date_intervention === targetDate);
        const profileIds = Array.from(new Set(dayAffs.map((a: Affectation) => a.profile_id)));
        const activeMembers = allProfs.filter((p: Profile) => profileIds.includes(p.id));
        setTeamMembers(activeMembers);
      }
    } catch (err) {
      console.error('Erreur chargement chantier:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchChantier = async () => {
      if (!id) return;
      try {
        const [found, allAffs, allProfs] = await Promise.all([
          db.chantiers.get(id),
          db.affectations.where('chantier_id').equals(id).toArray(),
          db.profiles.toArray(),
        ]);

        if (isMounted && found) {
          setChantier(found);
          setAffectations(allAffs);
          setAllProfiles(allProfs);

          const dayAffs = allAffs.filter((a) => a.date_intervention === targetDate);
          const profileIds = Array.from(new Set(dayAffs.map((a: Affectation) => a.profile_id)));
          const activeMembers = allProfs.filter((p: Profile) => profileIds.includes(p.id));
          setTeamMembers(activeMembers);
        }
      } catch (err) {
        console.error('Erreur chargement chantier:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchChantier();
    return () => {
      isMounted = false;
    };
  }, [id, targetDate]);

  // Changement de statut par le chef d'équipe
  const handleStatutChange = async (newStatut: ChantierStatut) => {
    if (!chantier) return;
    try {
      await db.chantiers.update(chantier.id, { statut: newStatut });
      setChantier((prev) => (prev ? { ...prev, statut: newStatut } : null));

      if (isOnline) {
        await supabase.from('chantiers').update({ statut: newStatut }).eq('id', chantier.id);
      }

      setActionFeedback('Statut du chantier mis à jour');
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Ajout / Retrait d'un équipier pour la date ciblée
  const handleToggleWorker = async (targetWorkerId: string) => {
    if (!chantier) return;

    const existingAff = affectations.find(
      (a) =>
        a.chantier_id === chantier.id &&
        a.profile_id === targetWorkerId &&
        a.date_intervention === targetDate
    );

    try {
      if (existingAff) {
        // Retirer l'affectation
        await db.affectations.delete(existingAff.id);
        if (isOnline) {
          await supabase.from('affectations').delete().eq('id', existingAff.id);
        }
        setActionFeedback('Équipier retiré du chantier');
      } else {
        // Créer l'affectation
        const newAffId = generateUUID();

        const newAff: Affectation = {
          id: newAffId,
          chantier_id: chantier.id,
          profile_id: targetWorkerId,
          date_intervention: targetDate,
        };

        await db.affectations.put(newAff);
        if (isOnline) {
          await supabase.from('affectations').insert({
            id: newAff.id,
            chantier_id: newAff.chantier_id,
            profile_id: newAff.profile_id,
            date_intervention: newAff.date_intervention,
          });
        }
        setActionFeedback('Équipier affecté au chantier');
      }

      await refreshChantierData();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erreur modification affectation:', err);
    }
  };

  const assignedWorkerIdsForDate = useMemo(() => {
    return affectations
      .filter((a) => a.date_intervention === targetDate)
      .map((a) => a.profile_id);
  }, [affectations, targetDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-xs text-foret/60">
        Chargement de la fiche chantier...
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center space-y-3 border border-sable">
        <p className="text-sm font-bold text-foret">Chantier introuvable</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs font-bold text-terracotta underline"
        >
          Retourner au planning
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre de retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-sable/80 text-foret active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-sauge">
            Fiche Chantier
          </span>
        </div>

        {isSupervisor && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-700" />
            Mode Superviseur
          </span>
        )}
      </div>

      {actionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Titre & Statut */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              chantier.statut === 'en_cours'
                ? 'bg-emerald-100 text-emerald-800'
                : chantier.statut === 'termine'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {chantier.statut === 'en_cours'
              ? 'En cours'
              : chantier.statut === 'termine'
              ? 'Terminé'
              : 'En attente'}
          </span>
          <span className="text-xs text-foret/60 flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-terracotta" />
            Du {chantier.date_debut || '15/09'} au {chantier.date_fin || '30/09'}
          </span>
        </div>

        <h1 className="text-lg font-extrabold text-foret leading-snug">{chantier.nom_client}</h1>

        {/* Bouton GPS d'action immédiate */}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(chantier.adresse)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 bg-terracotta hover:bg-terracotta/90 active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>Lancer le GPS (Waze / Google Maps)</span>
        </a>

        {/* Adresse */}
        <div className="p-3 bg-craie rounded-xl border border-sable/60 flex items-start gap-2.5 text-xs text-foret/80">
          <MapPin className="w-4 h-4 text-foret/60 shrink-0 mt-0.5" />
          <span>{chantier.adresse}</span>
        </div>
      </div>

      {/* Espace Chef d'équipe : Gestion du chantier & Affectations */}
      {isSupervisor && (
        <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-sable/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foret flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Pilotage Superviseur
            </span>
            <span className="text-[11px] text-sauge">Chef d'équipe</span>
          </div>

          {/* Modification du statut du chantier */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foret/80 block">Statut du chantier</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(['en_attente', 'en_cours', 'termine'] as ChantierStatut[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatutChange(st)}
                  className={`py-2 px-1 rounded-xl font-bold transition-all cursor-pointer ${
                    chantier.statut === st
                      ? 'bg-foret text-sable shadow-xs'
                      : 'bg-craie text-foret/70 border border-sable hover:bg-sable/40'
                  }`}
                >
                  {st === 'en_attente' && 'En attente'}
                  {st === 'en_cours' && 'En cours'}
                  {st === 'termine' && 'Terminé'}
                </button>
              ))}
            </div>
          </div>

          {/* Affectation des ouvriers */}
          <div className="space-y-2 pt-2 border-t border-sable/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foret/80 block">
                Affecter les équipiers au :
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="text-xs font-bold text-foret bg-craie rounded-lg p-1.5 border border-sable cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-sauge">
              Cochez les équipiers qui doivent intervenir sur ce chantier à cette date :
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {allProfiles.map((p) => {
                const isAssigned = assignedWorkerIdsForDate.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleWorker(p.id)}
                    className={`w-full p-2 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer border ${
                      isAssigned
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-craie border-sable/70 text-foret/70 hover:bg-sable/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isAssigned ? 'bg-emerald-600 text-white' : 'bg-sable text-foret'
                        }`}
                      >
                        {p.prenom.charAt(0)}
                      </div>
                      <span>
                        {p.prenom} {p.nom} ({p.role === 'chef_equipe' ? 'Chef' : 'Ouvrier'})
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isAssigned
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-sable text-transparent'
                      }`}
                    >
                      {isAssigned ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-foret/30" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Contact Client */}
      {chantier.contact_client && (
        <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sauge block">
            Contact Client
          </span>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foret">{chantier.contact_client}</p>
              <p className="text-[11px] text-foret/60">{chantier.telephone_client}</p>
            </div>
            {chantier.telephone_client && (
              <a
                href={`tel:${chantier.telephone_client}`}
                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-1 text-xs font-bold"
              >
                <Phone className="w-4 h-4" />
                <span>Appeler</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Descriptif des travaux */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-foret" />
          Travaux à réaliser
        </span>
        <p className="text-xs text-foret/80 leading-relaxed whitespace-pre-line bg-craie p-3 rounded-xl border border-sable/50">
          {chantier.description || 'Aucun descriptif spécifique renseigné.'}
        </p>
      </div>

      {/* Équipe assignée à cette date */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-foret" />
            Équipe sur le chantier ({teamMembers.length})
          </span>
          <span className="text-[10px] text-foret/60 font-mono">Date : {targetDate}</span>
        </div>

        {teamMembers.length === 0 ? (
          <p className="text-xs text-foret/50 italic py-2 text-center">
            Aucun équipier assigné à cette date.
          </p>
        ) : (
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-craie border border-sable/50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-foret text-sable text-xs font-bold flex items-center justify-center">
                    {member.prenom.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foret">
                      {member.prenom} {member.nom}
                    </p>
                    <p className="text-[10px] font-semibold text-sauge capitalize">
                      {member.role === 'chef_equipe' ? "Chef d'équipe" : 'Ouvrier paysagiste'}
                    </p>
                  </div>
                </div>

                {member.telephone && (
                  <a
                    href={`tel:${member.telephone}`}
                    className="p-2 rounded-lg bg-white border border-sable text-foret hover:text-terracotta transition-colors"
                    title="Appeler"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
