import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  MapPin,
  Navigation,
  UserCheck,
  Users,
} from 'lucide-react';
import type { Affectation, Chantier, ChantierStatut, Profile } from '../../types/database';
import { getMapsUrl } from '../../lib/formatters';

interface ChantierCardProps {
  chantier: Chantier;
  affectations: Affectation[];
  profiles: Profile[];
  todayStr: string;
  onEdit: (chantier: Chantier) => void;
  onAssign: (chantier: Chantier) => void;
}

function renderCatalogStatusBadge(statut: ChantierStatut) {
  switch (statut) {
    case 'en_cours':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border-emerald-700/60 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
          En cours
        </span>
      );
    case 'en_attente':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/75 dark:text-amber-300 dark:border-amber-700/60 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          En attente
        </span>
      );
    case 'termine':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-900 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          Terminé
        </span>
      );
  }
}

export const ChantierCard: React.FC<ChantierCardProps> = ({
  chantier,
  affectations,
  profiles,
  todayStr,
  onEdit,
  onAssign,
}) => {
  const todayAffs = affectations.filter(
    (a) => a.chantier_id === chantier.id && a.date_intervention === todayStr
  );
  const assignedWorkerNames = todayAffs
    .map((a) => {
      const p = profiles.find((prof) => prof.id === a.profile_id);
      return p ? `${p.prenom} ${p.nom.charAt(0)}.` : null;
    })
    .filter((name): name is string => Boolean(name));

  return (
    <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5 transition-all hover:border-sauge dark:hover:border-[#4A6B66]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-foret dark:text-[#EDF2F0] leading-snug">{chantier.nom_client}</h2>
          {chantier.date_debut && (
            <span className="text-[11px] text-sauge dark:text-[#9BB89B] font-medium flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69]" />
              <span>
                {chantier.date_debut}
                {chantier.date_fin ? ` au ${chantier.date_fin}` : ''}
              </span>
            </span>
          )}
        </div>
        {renderCatalogStatusBadge(chantier.statut)}
      </div>

      <a
        href={getMapsUrl(chantier.adresse)}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-[48px] flex items-center gap-2 p-2.5 rounded-2xl bg-craie hover:bg-sable/40 border border-sable/50 text-xs text-foret font-medium transition-colors group cursor-pointer dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] dark:border-[#304744] dark:text-[#EDF2F0]"
      >
        <MapPin className="w-4 h-4 text-foret dark:text-[#9BB89B] shrink-0 group-hover:scale-110 transition-transform" />
        <span className="underline-offset-2 group-hover:underline truncate">{chantier.adresse}</span>
        <Navigation className="w-3.5 h-3.5 ml-auto text-foret/40 group-hover:text-foret dark:text-[#8FA5A0] dark:group-hover:text-[#EDF2F0] shrink-0" />
      </a>

      {chantier.description && (
        <p className="text-xs text-foret/80 dark:text-[#B8C7C2] bg-craie dark:bg-[#1E2E2C] p-3 rounded-2xl border border-sable/50 dark:border-[#304744] line-clamp-2 leading-relaxed">
          {chantier.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs pt-1 border-t border-sable/40 dark:border-[#2A3F3C]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Users className="w-3.5 h-3.5 text-sauge dark:text-[#9BB89B] shrink-0" />
          {assignedWorkerNames.length > 0 ? (
            <span className="text-xs font-semibold text-foret dark:text-[#EDF2F0]">
              {assignedWorkerNames.join(', ')}
            </span>
          ) : (
            <span className="text-xs text-foret/60 dark:text-[#8FA5A0] italic">Aucun ouvrier affecté aujourd'hui</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onEdit(chantier)}
          className="min-h-[48px] py-2.5 px-2 bg-craie hover:bg-sable/40 active:scale-95 text-foret font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 border border-sable/70 transition-all cursor-pointer dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] dark:text-[#EDF2F0] dark:border-[#304744]"
        >
          <Edit3 className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69]" />
          <span>Modifier</span>
        </button>

        <button
          type="button"
          onClick={() => onAssign(chantier)}
          className="min-h-[48px] py-2.5 px-2 bg-craie hover:bg-sable/40 active:scale-95 text-foret font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 border border-sable/70 transition-all cursor-pointer dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] dark:text-[#EDF2F0] dark:border-[#304744]"
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
          <span>Affecter</span>
        </button>

        <Link
          to={`/chantier/${chantier.id}`}
          className="min-h-[48px] py-2.5 px-2 bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] active:scale-95 text-sable dark:text-[#EDF2F0] font-bold text-xs rounded-2xl flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
        >
          <span>Détails</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
