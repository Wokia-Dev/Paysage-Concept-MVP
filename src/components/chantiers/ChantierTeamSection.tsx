import React from 'react';
import { MessageSquare, Phone, Users } from 'lucide-react';
import type { Profile } from '../../types/database';
import { getRoleBadgeConfig, getRoleLabel, sanitizePhoneHref } from '../../lib/formatters';

interface ChantierTeamSectionProps {
  teamMembers: Profile[];
  currentUserId?: string;
  targetDate: string;
}

export const ChantierTeamSection: React.FC<ChantierTeamSectionProps> = ({
  teamMembers,
  currentUserId,
  targetDate,
}) => {
  return (
    <div className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sauge/20 dark:bg-[#235852]/40 text-foret dark:text-[#9BB89B] flex items-center justify-center">
            <Users className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B]">
            Équipe sur le chantier ({teamMembers.length})
          </h2>
        </div>
        <span className="text-[11px] text-foret/60 dark:text-[#B8C7C2] font-mono">Date : {targetDate}</span>
      </div>

      {teamMembers.length === 0 ? (
        <p className="text-xs text-foret/50 dark:text-[#8FA5A0] italic py-2 text-center">
          Aucun équipier assigné à cette date.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Ligne horizontale d'avatars avec pastilles de présence */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {teamMembers.map((member) => {
              const isCurrentUser = currentUserId === member.id;
              return (
                <div key={member.id} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full text-sm font-bold flex items-center justify-center border-2 shadow-soft ${
                        isCurrentUser
                          ? 'bg-foret dark:bg-[#235852] text-sable dark:text-[#EDF2F0] ring-2 ring-sauge/60 border-white dark:border-[#172322]'
                          : 'bg-foret dark:bg-[#263A37] text-sable dark:text-[#D5E6DC] border-white dark:border-[#172322]'
                      }`}
                    >
                      {member.prenom.charAt(0)}
                    </div>
                    <span
                      className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#172322] absolute -bottom-0.5 -right-0.5 shadow-2xs"
                      title="Présent sur le terrain"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-foret dark:text-[#EDF2F0] max-w-[68px] truncate text-center">
                    {member.prenom} {isCurrentUser && '(Vous)'}
                  </span>
                  <span className="text-[9px] font-medium text-sauge dark:text-[#9BB89B] -mt-0.5">
                    {getRoleLabel(member.role, 'short')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Liste détaillée des équipiers avec actions Message & Appel */}
          <div className="space-y-2 pt-2 border-t border-sable/50 dark:border-[#2A3F3C]">
            {teamMembers.map((member) => {
              const isCurrentUser = currentUserId === member.id;
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                    isCurrentUser
                      ? 'bg-sable/30 border-sable/90 dark:bg-[#223532] dark:border-[#397A75]/60'
                      : 'bg-craie border-sable/50 dark:bg-[#1E2E2C] dark:border-[#304744]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shadow-2xs ${
                          isCurrentUser
                            ? 'bg-foret dark:bg-[#235852] text-sable dark:text-[#EDF2F0] ring-1 ring-sauge/50'
                            : 'bg-foret dark:bg-[#263A37] text-sable dark:text-[#D5E6DC]'
                        }`}
                      >
                        {member.prenom.charAt(0)}
                      </div>
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#1E2E2C] absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-foret dark:text-[#EDF2F0] truncate">
                          {member.prenom} {member.nom}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-foret dark:bg-[#235852] text-sable dark:text-[#EDF2F0] leading-tight shrink-0">
                            Vous
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${getRoleBadgeConfig(member.role).className}`}
                      >
                        {getRoleBadgeConfig(member.role).label}
                      </span>
                    </div>
                  </div>

                  {!isCurrentUser &&
                    (member.telephone ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`sms:${sanitizePhoneHref(member.telephone)}`}
                          className="min-w-[48px] min-h-[48px] rounded-xl bg-white border border-sable text-foret hover:text-foret hover:border-foret active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer dark:bg-[#172322] dark:border-[#354F4C] dark:text-[#EDF2F0] dark:hover:border-[#4EB0A2]"
                          title={`Envoyer un SMS à ${member.prenom}`}
                          aria-label={`Envoyer un SMS à ${member.prenom}`}
                        >
                          <MessageSquare className="w-4 h-4 text-foret dark:text-[#9BB89B]" />
                        </a>

                        <a
                          href={`tel:${sanitizePhoneHref(member.telephone)}`}
                          className="min-w-[48px] min-h-[48px] rounded-xl bg-white border border-sable text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer dark:bg-[#172322] dark:border-[#354F4C] dark:text-emerald-400 dark:hover:border-emerald-600"
                          title="Appeler l'équipier"
                          aria-label={`Appeler ${member.prenom}`}
                        >
                          <Phone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-[10px] text-foret/40 dark:text-[#8FA5A0] italic px-2 py-1 bg-craie dark:bg-[#172322] rounded-lg border border-sable/40 dark:border-[#304744]">
                        Sans numéro
                      </span>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
