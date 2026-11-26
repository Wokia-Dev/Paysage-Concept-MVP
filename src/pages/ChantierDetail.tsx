import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useChantierDetail } from '../hooks/useChantierDetail';
import { getMapsUrl } from '../lib/formatters';
import { ChantierTeamSection } from '../components/chantiers/ChantierTeamSection';
import { ChantierDocumentsSection } from '../components/chantiers/ChantierDocumentsSection';
import { ChantierSupervisorPanel } from '../components/chantiers/ChantierSupervisorPanel';

export function ChantierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const detail = useChantierDetail(id, profile);

  if (detail.loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-xs text-foret/60">
        Chargement de la fiche chantier...
      </div>
    );
  }

  if (!detail.chantier) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center space-y-3 border border-sable shadow-soft">
        <p className="text-sm font-bold text-foret">Chantier introuvable</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[48px] px-4 py-2 text-xs font-bold text-foret underline cursor-pointer"
        >
          Retourner au planning
        </button>
      </div>
    );
  }

  if (profile?.role === 'ouvrier' && !detail.isAssignedWorker) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center space-y-4 border border-sable shadow-soft max-w-md mx-auto my-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foret">Accès restreint</h2>
          <p className="text-xs text-foret/70 mt-1 leading-relaxed">
            Vous n'êtes pas affecté à ce chantier. Les ouvriers ont accès uniquement à la fiche
            détaillée de leur chantier d'intervention.
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

  const { chantier } = detail;

  return (
    <div className="space-y-4">
      {/* Barre d'action supérieure */}
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
          {detail.isSupervisor && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              Superviseur
            </span>
          )}

          <a
            href={getMapsUrl(chantier.adresse)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-foret text-white shadow-soft flex items-center justify-center hover:bg-foret/90 active:scale-95 transition-all cursor-pointer"
            title="Lancer le GPS"
          >
            <Navigation className="w-5 h-5" />
          </a>
        </div>
      </div>

      {detail.actionFeedback && (
        <div
          className={`p-3.5 border text-xs rounded-2xl flex items-center gap-2 shadow-xs ${
            detail.actionFeedbackType === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {detail.actionFeedbackType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span className="font-semibold">{detail.actionFeedback}</span>
        </div>
      )}

      {/* Conteneur Hero Typographique */}
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

        <h1 className="text-xl font-extrabold text-foret leading-snug tracking-tight">
          Chantier : {chantier.nom_client}
        </h1>

        <a
          href={getMapsUrl(chantier.adresse)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[48px] py-3 px-4 bg-foret hover:bg-foret/90 active:scale-98 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-foret/20 transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>Lancer la navigation GPS (Waze / Google Maps)</span>
        </a>

        <div className="p-3 bg-craie rounded-2xl border border-sable/60 flex items-start gap-2.5 text-xs text-foret/80 font-medium">
          <MapPin className="w-4 h-4 text-foret shrink-0 mt-0.5" />
          <span className="leading-relaxed">{chantier.adresse}</span>
        </div>
      </div>

      {/* Section Équipe */}
      <ChantierTeamSection
        teamMembers={detail.teamMembers}
        currentUserId={profile?.id}
        targetDate={detail.targetDate}
      />

      {/* Section Documents */}
      <ChantierDocumentsSection />

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

      {/* Espace Superviseur */}
      {detail.isSupervisor && (
        <ChantierSupervisorPanel
          statut={chantier.statut}
          targetDate={detail.targetDate}
          allProfiles={detail.allProfiles}
          assignedWorkerIdsForDate={detail.assignedWorkerIdsForDate}
          onStatutChange={detail.handleStatutChange}
          onDateChange={detail.setTargetDate}
          onToggleWorker={detail.handleToggleWorker}
        />
      )}
    </div>
  );
}
