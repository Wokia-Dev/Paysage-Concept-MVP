import React from 'react';
import { MessageSquare, Phone, Users } from 'lucide-react';
import type { Profile } from '../../types/database';
import { sanitizePhoneHref } from '../../lib/formatters';

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
              const isCurrentUser = currentUserId === member.id;
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

          {/* Liste détaillée des équipiers avec actions Message & Appel */}
          <div className="space-y-2 pt-2 border-t border-sable/50">
            {teamMembers.map((member) => {
              const isCurrentUser = currentUserId === member.id;
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                    isCurrentUser ? 'bg-sable/30 border-sable/90' : 'bg-craie border-sable/50'
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

                  {!isCurrentUser &&
                    (member.telephone ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`sms:${sanitizePhoneHref(member.telephone)}`}
                          className="min-w-[48px] min-h-[48px] rounded-xl bg-white border border-sable text-foret hover:text-foret hover:border-foret active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                          title={`Envoyer un SMS à ${member.prenom}`}
                          aria-label={`Envoyer un SMS à ${member.prenom}`}
                        >
                          <MessageSquare className="w-4 h-4 text-foret" />
                        </a>

                        <a
                          href={`tel:${sanitizePhoneHref(member.telephone)}`}
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
