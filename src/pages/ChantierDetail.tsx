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
  Briefcase,
  FileText,
  Camera,
  MessageSquare,
  AlertCircle,
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

  // Restriction ouvrier : accès réservé à son chantier d'affectation
  const isAssignedWorker = useMemo(() => {
    if (!profile || profile.role !== 'ouvrier') return true;
    return affectations.some((a) => a.profile_id === profile.id);
  }, [profile, affectations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-xs text-foret/60">
        Chargement de la fiche chantier...
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center space-y-3 border border-sable shadow-soft">
        <p className="text-sm font-bold text-foret">Chantier introuvable</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[48px] px-4 py-2 text-xs font-bold text-terracotta underline cursor-pointer"
        >
          Retourner au planning
        </button>
      </div>
    );
  }

  if (profile?.role === 'ouvrier' && !isAssignedWorker) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center space-y-4 border border-sable shadow-soft max-w-md mx-auto my-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foret">Accès restreint</h2>
          <p className="text-xs text-foret/70 mt-1 leading-relaxed">
            Vous n'êtes pas affecté à ce chantier. Les ouvriers ont accès uniquement à la fiche détaillée de leur chantier d'intervention.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="min-h-[48px] px-6 py-2.5 bg-foret text-white text-xs font-bold rounded-2xl hover:bg-foret/90 transition-colors cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'action supérieure avec boutons d'action circulaires flottants (48x48px) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-sable/80 text-foret shadow-soft flex items-center justify-center hover:bg-craie active:scale-95 transition-all cursor-pointer"
          title="Retour au planning"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {isSupervisor && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              Superviseur
            </span>
          )}

          {/* Bouton circulaire flottant de lancement GPS */}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(chantier.adresse)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-terracotta text-white shadow-soft flex items-center justify-center hover:bg-terracotta/90 active:scale-95 transition-all cursor-pointer"
            title="Lancer le GPS"
          >
            <Navigation className="w-5 h-5" />
          </a>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 rounded-2xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionFeedback}</span>
        </div>
      )}

      {/* Conteneur Hero Typographique épuré (Sans bannière photo) */}
      <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              chantier.statut === 'en_cours'
                ? 'bg-sauge/20 text-foret border border-sauge/40'
                : chantier.statut === 'termine'
                  ? 'bg-craie text-foret/70 border border-sable'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
            }`}
          >
            {chantier.statut === 'en_cours'
              ? 'En cours'
              : chantier.statut === 'termine'
                ? 'Terminé'
                : 'En attente'}
          </span>
          <span className="text-xs text-foret/70 flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-terracotta" />
            Du {chantier.date_debut || '15/09'} au {chantier.date_fin || '30/09'}
          </span>
        </div>

        {/* Titre client en gras Vert Forêt (Chantier : [Client]) */}
        <h1 className="text-xl font-extrabold text-foret leading-snug tracking-tight">
          Chantier : {chantier.nom_client}
        </h1>

        {/* Bouton GPS d'action immédiate outdoor (min 48px) */}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(chantier.adresse)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[48px] py-3 px-4 bg-terracotta hover:bg-terracotta/90 active:scale-98 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-terracotta/20 transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>Lancer la navigation GPS (Waze / Google Maps)</span>
        </a>

        {/* Adresse formatée avec icône MapPin */}
        <div className="p-3 bg-craie rounded-2xl border border-sable/60 flex items-start gap-2.5 text-xs text-foret/80 font-medium">
          <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
          <span className="leading-relaxed">{chantier.adresse}</span>
        </div>
      </div>

      {/* Section "Équipe" avec ligne d'avatars horizontale & indicateurs de présence */}
      <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sauge/20 text-foret flex items-center justify-center">
              <Users className="w-4 h-4 text-foret" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-sauge">
              Équipe sur le chantier ({teamMembers.length})
            </h2>
          </div>
          <span className="text-[11px] text-foret/60 font-mono">Date : {targetDate}</span>
        </div>

        {teamMembers.length === 0 ? (
          <p className="text-xs text-foret/50 italic py-2 text-center">
            Aucun équipier assigné à cette date.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Ligne horizontale d'avatars avec pastilles de présence */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              {teamMembers.map((member) => {
                const isCurrentUser = profile?.id === member.id;
                return (
                  <div key={member.id} className="flex flex-col items-center gap-1 shrink-0">
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-full text-sm font-bold flex items-center justify-center border-2 shadow-soft ${
                          isCurrentUser
                            ? 'bg-foret text-sable ring-2 ring-sauge/60 border-white'
                            : 'bg-foret text-sable border-white'
                        }`}
                      >
                        {member.prenom.charAt(0)}
                      </div>
                      {/* Pastille de présence verte */}
                      <span
                        className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-2xs"
                        title="Présent sur le terrain"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-foret max-w-[68px] truncate text-center">
                      {member.prenom} {isCurrentUser && '(Vous)'}
                    </span>
                    <span className="text-[9px] font-medium text-sauge -mt-0.5">
                      {member.role === 'chef_equipe' ? 'Chef' : 'Ouvrier'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Liste détaillée des équipiers avec actions Message & Appel tactiles (>= 48px) */}
            <div className="space-y-2 pt-2 border-t border-sable/50">
              {teamMembers.map((member) => {
                const isCurrentUser = profile?.id === member.id;
                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                      isCurrentUser
                        ? 'bg-sable/30 border-sable/90'
                        : 'bg-craie border-sable/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shadow-2xs ${
                            isCurrentUser
                              ? 'bg-foret text-sable ring-1 ring-sauge/50'
                              : 'bg-foret text-sable'
                          }`}
                        >
                          {member.prenom.charAt(0)}
                        </div>
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-foret truncate">
                            {member.prenom} {member.nom}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-foret text-sable leading-tight shrink-0">
                              Vous
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-sauge capitalize truncate">
                          {member.role === 'chef_equipe' ? "Chef d'équipe" : 'Ouvrier paysagiste'}
                        </p>
                      </div>
                    </div>

                    {/* Actions d'appel et de message masquées pour soi-même */}
                    {!isCurrentUser && (
                      member.telephone ? (
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Bouton Message SMS direct vers l'équipier */}
                          <a
                            href={`sms:${member.telephone.replace(/\s+/g, '')}`}
                            className="min-w-[48px] min-h-[48px] rounded-xl bg-white border border-sable text-foret hover:text-terracotta hover:border-sauge active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                            title={`Envoyer un SMS à ${member.prenom}`}
                            aria-label={`Envoyer un SMS à ${member.prenom}`}
                          >
                            <MessageSquare className="w-4 h-4 text-foret" />
                          </a>

                          {/* Bouton Appel téléphonique direct */}
                          <a
                            href={`tel:${member.telephone.replace(/\s+/g, '')}`}
                            className="min-w-[48px] min-h-[48px] rounded-xl bg-white border border-sable text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                            title="Appeler l'équipier"
                            aria-label={`Appeler ${member.prenom}`}
                          >
                            <Phone className="w-4 h-4 text-emerald-700" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-foret/40 italic px-2 py-1 bg-craie rounded-lg border border-sable/40">
                          Sans numéro
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section "Documents" : Cartes typographiques épurées avec badge PDF Terracotta */}
      <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-terracotta/15 text-terracotta flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-sauge">
              Documents & Plans du chantier
            </h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable text-foret/80">
            2 fichiers
          </span>
        </div>

        {/* Grille de 2 cartes Documents épurées */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Document 1 : Plan d'aménagement.pdf */}
          <div className="p-3.5 rounded-2xl bg-craie border border-sable/70 flex items-center gap-3 hover:border-sauge transition-all shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-terracotta text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-foret truncate">Plan d'aménagement.pdf</p>
              <p className="text-[11px] text-foret/60">PDF technique • 2.4 Mo</p>
            </div>
          </div>

          {/* Document 2 : Devis signé.pdf */}
          <div className="p-3.5 rounded-2xl bg-craie border border-sable/70 flex items-center gap-3 hover:border-sauge transition-all shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-terracotta text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-foret truncate">Devis signé.pdf</p>
              <p className="text-[11px] text-foret/60">Contrat client • 840 Ko</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Photos : Placeholder épuré sans téléversement (aucun input file) */}
      <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sable text-foret flex items-center justify-center">
              <Camera className="w-4 h-4 text-foret" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-sauge">
              Photos du chantier
            </h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable text-foret/70">
            Phase 2
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-craie border border-dashed border-sable/80 text-center space-y-1.5">
          <p className="text-xs font-bold text-foret">
            Module photos et galerie terrain à venir
          </p>
          <p className="text-[11px] text-sauge leading-relaxed max-w-sm mx-auto">
            La capture de photos sur chantier, l'historique visuel avant/après et les constats d'avancement sont réservés pour la prochaine mise à jour de l'application.
          </p>
        </div>
      </div>

      {/* Descriptif des travaux */}
      <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-foret" />
          Travaux à réaliser
        </span>
        <p className="text-xs text-foret/80 leading-relaxed whitespace-pre-line bg-craie p-3.5 rounded-2xl border border-sable/50 font-medium">
          {chantier.description || 'Aucun descriptif spécifique renseigné.'}
        </p>
      </div>

      {/* Contact Client */}
      {chantier.contact_client && (
        <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-2">
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
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Appeler</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Espace Chef d'équipe : Gestion du chantier & Affectations préservé */}
      {isSupervisor && (
        <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-sable/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foret flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Pilotage Superviseur
            </span>
            <span className="text-[11px] text-sauge font-medium">Chef d'équipe</span>
          </div>

          {/* Modification du statut du chantier avec cibles tactiles >= 48px */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foret/80 block">Statut du chantier</label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['en_attente', 'en_cours', 'termine'] as ChantierStatut[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatutChange(st)}
                  className={`min-h-[48px] py-2 px-1 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center ${
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
                className="min-h-[48px] text-xs font-bold text-foret bg-craie rounded-xl px-2.5 py-2 border border-sable cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-sauge">
              Cochez les équipiers qui doivent intervenir sur ce chantier à cette date :
            </p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
              {allProfiles.map((p) => {
                const isAssigned = assignedWorkerIdsForDate.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleWorker(p.id)}
                    className={`w-full min-h-[48px] p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer border ${
                      isAssigned
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-craie border-sable/70 text-foret/70 hover:bg-sable/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
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
                      className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                        isAssigned
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-sable text-transparent'
                      }`}
                    >
                      {isAssigned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-foret/30" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
