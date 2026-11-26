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
      <div className="flex items-center justify-center min-h-[300px] text-xs text-foret/60 dark:text-[#B8C7C2]">
        Chargement de la fiche chantier...
      </div>
    );
  }

  if (!detail.chantier) {
    return (
      <div className="bg-white dark:bg-[#172322] rounded-3xl p-6 text-center space-y-3 border border-sable dark:border-[#2A3F3C] shadow-soft">
        <p className="text-sm font-bold text-foret dark:text-[#EDF2F0]">Chantier introuvable</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[48px] px-4 py-2 text-xs font-bold text-foret dark:text-[#9BB89B] underline cursor-pointer"
        >
          Retourner au planning
        </button>
      </div>
    );
  }

  if (profile?.role === 'ouvrier' && !detail.isAssignedWorker) {
    return (
      <div className="bg-white dark:bg-[#172322] rounded-3xl p-6 text-center space-y-4 border border-sable dark:border-[#2A3F3C] shadow-soft max-w-md mx-auto my-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/70 dark:border-amber-700/60 dark:text-amber-300 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foret dark:text-[#EDF2F0]">Accès restreint</h2>
          <p className="text-xs text-foret/70 dark:text-[#B8C7C2] mt-1 leading-relaxed">
            Vous n'êtes pas affecté à ce chantier. Les ouvriers ont accès uniquement à la fiche
            détaillée de leur chantier d'intervention.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="min-h-[48px] px-6 py-2.5 bg-foret dark:bg-[#235852] text-white text-xs font-bold rounded-2xl hover:bg-foret/90 dark:hover:bg-[#2B6962] transition-colors cursor-pointer"
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
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white dark:bg-[#172322] border border-sable/80 dark:border-[#2A3F3C] text-foret dark:text-[#EDF2F0] shadow-soft flex items-center justify-center hover:bg-craie dark:hover:bg-[#1E2E2C] active:scale-95 transition-all cursor-pointer"
          title="Retour au planning"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {detail.isSupervisor && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/75 dark:text-amber-300 dark:border-amber-700/60 flex items-center gap-1 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              Superviseur
            </span>
          )}

          <a
            href={getMapsUrl(chantier.adresse)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-foret dark:bg-[#235852] text-white shadow-soft flex items-center justify-center hover:bg-foret/90 dark:hover:bg-[#2B6962] active:scale-95 transition-all cursor-pointer"
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
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/75 dark:border-rose-700/60 dark:text-rose-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/75 dark:border-emerald-700/60 dark:text-emerald-200'
          }`}
        >
          {detail.actionFeedbackType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span className="font-semibold">{detail.actionFeedback}</span>
        </div>
      )}

      {/* Conteneur Hero Typographique */}
      <div className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5">
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              chantier.statut === 'en_cours'
                ? 'bg-sauge/20 text-foret border border-sauge/40 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border-emerald-700/60'
                : chantier.statut === 'termine'
                  ? 'bg-craie text-foret/70 border border-sable dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
                  : 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/75 dark:text-amber-300 dark:border-amber-700/60'
            }`}
          >
            {chantier.statut === 'en_cours'
              ? 'En cours'
              : chantier.statut === 'termine'
                ? 'Terminé'
                : 'En attente'}
          </span>
          <span className="text-xs text-foret/70 dark:text-[#B8C7C2] flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69]" />
            Du {chantier.date_debut || '15/09'} au {chantier.date_fin || '30/09'}
          </span>
        </div>

        <h1 className="text-xl font-extrabold text-foret dark:text-[#EDF2F0] leading-snug tracking-tight">
          Chantier : {chantier.nom_client}
        </h1>

        <a
          href={getMapsUrl(chantier.adresse)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[48px] py-3 px-4 bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] active:scale-98 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-foret/20 dark:shadow-none transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>Lancer la navigation GPS (Waze / Google Maps)</span>
        </a>

        <div className="p-3 bg-craie dark:bg-[#1E2E2C] rounded-2xl border border-sable/60 dark:border-[#304744] flex items-start gap-2.5 text-xs text-foret/80 dark:text-[#EDF2F0] font-medium">
          <MapPin className="w-4 h-4 text-foret dark:text-[#9BB89B] shrink-0 mt-0.5" />
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
      <div className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-foret dark:text-[#9BB89B]" />
          Travaux à réaliser
        </span>
        <p className="text-xs text-foret/80 dark:text-[#EDF2F0] leading-relaxed whitespace-pre-line bg-craie dark:bg-[#1E2E2C] p-3.5 rounded-2xl border border-sable/50 dark:border-[#304744] font-medium">
          {chantier.description || 'Aucun descriptif spécifique renseigné.'}
        </p>
      </div>

      {/* Contact Client */}
      {chantier.contact_client && (
        <div className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] block">
            Contact Client
          </span>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foret dark:text-[#EDF2F0]">{chantier.contact_client}</p>
              <p className="text-[11px] text-foret/60 dark:text-[#B8C7C2]">{chantier.telephone_client}</p>
            </div>
            {chantier.telephone_client && (
              <a
                href={`tel:${chantier.telephone_client}`}
                className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60 dark:hover:bg-emerald-900/70 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
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
