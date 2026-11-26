import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRightIcon,
  ExternalLink,
  MapPin,
  Users,
} from 'lucide-react';
import type { Profile } from '../../types/database';
import { getTodayDateString } from '../../lib/dates';
import { getMapsUrl } from '../../lib/formatters';
import type { DayItem, PlanningMission } from '../../lib/planningUtils';

interface PlanningDayViewProps {
  profile: Profile | null;
  selectedDate: string;
  weekAnchorDate: string;
  weekLabel: string;
  weekDays: DayItem[];
  selectedDayLabel: string;
  currentDayMissions: PlanningMission[];
  targetFilterProfileId: string | null;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToday: () => void;
  onSelectDate: (dateStr: string) => void;
  onContactMember: (member: Profile) => void;
}

export const PlanningDayView: React.FC<PlanningDayViewProps> = ({
  profile,
  selectedDate,
  weekAnchorDate,
  weekLabel,
  weekDays,
  selectedDayLabel,
  currentDayMissions,
  targetFilterProfileId,
  onPrevWeek,
  onNextWeek,
  onJumpToday,
  onSelectDate,
  onContactMember,
}) => {
  const todayStr = getTodayDateString(0);

  return (
    <>
      {/* Navigation entre semaines avec bouton Aujourd'hui dédié */}
      <div className="flex items-center justify-between bg-white dark:bg-[#172322] rounded-2xl p-2 border border-sable/70 dark:border-[#2A3F3C] shadow-xs">
        <button
          type="button"
          onClick={onPrevWeek}
          className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie dark:hover:bg-[#263A37] text-foret/70 dark:text-[#B8C7C2] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          title="Semaine précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-foret dark:text-[#EDF2F0] capitalize flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69]" />
          {weekLabel}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onJumpToday}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
              selectedDate === todayStr && weekAnchorDate === todayStr
                ? 'bg-craie text-foret/40 border-sable/50 dark:bg-[#1E2E2C] dark:text-[#8FA5A0] dark:border-[#304744]'
                : 'bg-sable/80 hover:bg-sable text-foret border-sable shadow-2xs font-extrabold dark:bg-[#263A37] dark:hover:bg-[#314A46] dark:text-[#EDF2F0] dark:border-[#38524E]'
            }`}
            title="Revenir à aujourd'hui"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie dark:hover:bg-[#263A37] text-foret/70 dark:text-[#B8C7C2] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
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
              onClick={() => onSelectDate(day.dateStr)}
              className={`flex-1 min-w-[48px] min-h-[52px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-foret text-sable shadow-md scale-105 dark:bg-[#235852] dark:text-[#EDF2F0] dark:border dark:border-[#4EB0A2]/60'
                  : day.isToday
                    ? 'bg-foret/10 border border-foret/30 text-foret font-bold dark:bg-[#1C3835] dark:border-[#397A75] dark:text-[#9BB89B]'
                    : 'bg-white hover:bg-sable/40 text-foret/80 border border-sable/70 dark:bg-[#172322] dark:hover:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#2A3F3C]'
              }`}
            >
              <span
                className={`text-[10px] font-bold tracking-wider ${isSelected ? 'text-sauge dark:text-[#9BB89B]' : ''}`}
              >
                {day.dayName}
              </span>
              <span className="text-sm font-extrabold mt-0.5">{day.dayNumber}</span>
              {day.isToday && <span className="w-1.5 h-1.5 rounded-full bg-foret dark:bg-[#4EB0A2] mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Programme structuré du jour */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] capitalize">
            {selectedDayLabel}
          </h2>
          <span className="text-xs font-semibold text-foret/60 dark:text-[#B8C7C2]">
            {currentDayMissions.length} chantier(s) prévu(s)
          </span>
        </div>

        {currentDayMissions.length === 0 ? (
          <div className="bg-white dark:bg-[#172322] rounded-3xl p-6 border border-sable/70 dark:border-[#2A3F3C] text-center space-y-2 shadow-soft">
            <CalendarDays className="w-8 h-8 mx-auto text-sauge/50 dark:text-[#9BB89B]/60" />
            <p className="text-sm font-bold text-foret dark:text-[#EDF2F0]">
              {profile?.role === 'ouvrier' || targetFilterProfileId
                ? 'Aucune intervention prévue pour cette journée'
                : "Aucun chantier d'équipe planifié ce jour"}
            </p>
            <p className="text-xs text-sauge dark:text-[#9BB89B]">
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
                className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-4 hover:border-sauge dark:hover:border-[#4A6B66] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base sm:text-lg text-foret dark:text-[#EDF2F0] leading-snug">
                        {chantier.nom_client}
                      </h3>
                      {isUserAssigned && (
                        <span className="text-[10px] font-bold text-foret bg-sable px-2.5 py-0.5 rounded-full dark:bg-[#263A37] dark:text-[#D5E6DC]">
                          Votre mission
                        </span>
                      )}
                    </div>
                    {chantier.description && (
                      <p className="text-xs text-foret/70 dark:text-[#B8C7C2] line-clamp-2 mt-1">
                        {chantier.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                      chantier.statut === 'en_cours'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border-emerald-700/60'
                        : 'bg-craie text-foret border-sable dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#304744]'
                    }`}
                  >
                    {chantier.statut === 'en_cours' ? 'En cours' : 'Planifié'}
                  </span>
                </div>

                <a
                  href={getMapsUrl(chantier.adresse)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] flex items-center gap-2.5 text-xs text-foret/80 hover:text-foret dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0] bg-craie dark:bg-[#1E2E2C] p-3 rounded-2xl border border-sable/60 dark:border-[#304744] active:scale-[0.99] transition-all group"
                  title="Ouvrir l'adresse dans Google Maps"
                >
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#172322] border border-sable dark:border-[#304744] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <MapPin className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
                  </div>
                  <span className="truncate font-medium text-foret dark:text-[#EDF2F0] flex-1">{chantier.adresse}</span>
                  <ExternalLink className="w-4 h-4 text-foret/40 group-hover:text-foret dark:text-[#8FA5A0] dark:group-hover:text-[#EDF2F0] shrink-0" />
                </a>

                <div className="space-y-2 pt-1 border-t border-sable/50 dark:border-[#2A3F3C]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sauge dark:text-[#9BB89B] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-foret dark:text-[#9BB89B]" />
                      Équipe sur place ({assignedMembers.length})
                    </span>
                    {assignedMembers.length > 0 && (
                      <span className="text-[11px] text-foret/60 dark:text-[#B8C7C2] font-medium">
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
                            onClick={() => onContactMember(m)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[40px] rounded-2xl border shadow-2xs transition-all cursor-pointer active:scale-95 text-left ${
                              isCurrentUser
                                ? 'bg-foret text-white border-foret ring-1 ring-sauge/40 dark:bg-[#235852] dark:border-[#397A75]'
                                : 'bg-craie hover:bg-white text-foret border-sable/80 hover:border-sauge dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] dark:text-[#EDF2F0] dark:border-[#304744]'
                            }`}
                            title={`Contacter ${m.prenom} ${m.nom}`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                                isCurrentUser
                                  ? 'bg-sable text-foret dark:bg-[#172322] dark:text-[#D5E6DC]'
                                  : 'bg-foret text-sable dark:bg-[#263A37] dark:text-[#D5E6DC]'
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
                                      : 'bg-sauge/20 text-foret dark:bg-[#263A37] dark:text-[#9BB89B]'
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
                    <p className="text-xs text-foret/50 dark:text-[#8FA5A0] italic">
                      Aucun équipier spécifiquement affecté.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-sable/40 dark:border-[#2A3F3C] flex justify-end">
                  <Link
                    to={`/chantier/${chantier.id}`}
                    className="min-h-[48px] px-4 py-2 bg-craie hover:bg-white text-foret hover:text-foret border border-sable/80 hover:border-foret font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-2xs transition-all active:scale-95 dark:bg-[#1E2E2C] dark:hover:bg-[#263A37] dark:text-[#EDF2F0] dark:border-[#304744] dark:hover:border-[#4EB0A2]"
                  >
                    <span>Consulter la fiche détaillée</span>
                    <ArrowRightIcon className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
