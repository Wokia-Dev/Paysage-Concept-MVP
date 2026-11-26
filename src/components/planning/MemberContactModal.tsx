import React from 'react';
import { MessageSquare, Phone, X } from 'lucide-react';
import type { Profile } from '../../types/database';
import { sanitizePhoneHref } from '../../lib/formatters';

interface MemberContactModalProps {
  member: Profile;
  currentUserId?: string;
  onClose: () => void;
}

export const MemberContactModal: React.FC<MemberContactModalProps> = ({
  member,
  currentUserId,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-foret/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 border border-sable/80 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-sable rounded-full mx-auto sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-foret text-sable text-base font-black flex items-center justify-center shrink-0 shadow-2xs">
              {member.prenom.charAt(0).toUpperCase()}
              {member.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 id="contact-modal-title" className="text-base font-extrabold text-foret leading-tight">
                {member.prenom} {member.nom}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-bold text-sauge uppercase tracking-wider">
                  {member.role === 'chef_equipe'
                    ? "Chef d'équipe"
                    : member.role === 'admin'
                      ? 'Direction'
                      : 'Ouvrier paysagiste'}
                </span>
                {member.id === currentUserId && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sable text-foret">
                    Vous
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl hover:bg-craie text-foret/60 hover:text-foret flex items-center justify-center transition-all cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-craie p-3 rounded-2xl border border-sable/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foret/60 font-medium">Téléphone :</span>
            <span className="font-bold text-foret font-mono">
              {member.telephone || 'Non renseigné'}
            </span>
          </div>
          {member.email && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-foret/60 font-medium">Email :</span>
              <span className="font-semibold text-foret/80 truncate max-w-[200px]">
                {member.email}
              </span>
            </div>
          )}
        </div>

        {member.telephone ? (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <a
              href={`sms:${sanitizePhoneHref(member.telephone)}`}
              className="min-h-[48px] px-4 py-3 bg-foret hover:bg-foret/90 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-sauge" />
              <span>Message</span>
            </a>

            <a
              href={`tel:${sanitizePhoneHref(member.telephone)}`}
              className="min-h-[48px] px-4 py-3 bg-foret hover:bg-foret/90 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-white" />
              <span>Téléphone</span>
            </a>
          </div>
        ) : (
          <div className="p-3 bg-craie rounded-2xl border border-sable/60 text-center text-xs text-foret/60 italic">
            Aucun numéro de téléphone renseigné pour cet équipier.
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] py-2.5 rounded-2xl bg-white hover:bg-craie text-foret/70 hover:text-foret border border-sable font-bold text-xs transition-all cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
