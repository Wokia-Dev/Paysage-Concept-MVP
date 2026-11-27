import React from 'react';
import { Check, Plus } from 'lucide-react';
import type { Profile } from '../../types/database';
import type { OtherChantierConflict } from '../../lib/affectationsUtils';
import { getInitials, getRoleLabel } from '../../lib/formatters';

interface AffectationWorkerRowContentProps {
  profile: Profile;
  isSelected: boolean;
  showPlusWhenUnselected?: boolean;
  coverageBadge?: {
    label: string;
    isFull: boolean;
  };
  conflicts: OtherChantierConflict[];
}

export const AffectationWorkerRowContent: React.FC<AffectationWorkerRowContentProps> = ({
  profile,
  isSelected,
  showPlusWhenUnselected = false,
  coverageBadge,
  conflicts,
}) => {
  const primaryConflict = conflicts[0];

  return (
    <>
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
            isSelected
              ? 'bg-emerald-700 text-white'
              : 'bg-foret/10 text-foret dark:bg-[#263A37] dark:text-[#D5E6DC]'
          }`}
        >
          {getInitials(profile.prenom, profile.nom)}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold leading-tight truncate">
              {profile.prenom} {profile.nom}
            </span>
            <span className="text-[10px] font-semibold opacity-75">
              ({getRoleLabel(profile.role, 'short')})
            </span>
          </div>
          {(coverageBadge || primaryConflict) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {coverageBadge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    coverageBadge.isFull
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200'
                      : 'bg-sable/70 text-foret dark:bg-[#263A37] dark:text-[#D5E6DC]'
                  }`}
                >
                  {coverageBadge.label}
                </span>
              )}
              {primaryConflict && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/75 dark:text-amber-300 truncate max-w-[185px]">
                  Aussi sur : {primaryConflict.nomClient}
                  {conflicts.length > 1 ? ` (+${conflicts.length - 1})` : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 transition-all ${
          isSelected
            ? 'bg-emerald-700 border-emerald-700 text-white'
            : showPlusWhenUnselected
              ? 'border-sable bg-white text-foret/35 dark:border-[#354F4C] dark:bg-[#172322] dark:text-[#8FA5A0]'
              : 'border-sable bg-white text-transparent dark:border-[#354F4C] dark:bg-[#172322]'
        }`}
      >
        {isSelected ? (
          <Check className="w-4 h-4 stroke-[3]" />
        ) : showPlusWhenUnselected ? (
          <Plus className="w-4 h-4" />
        ) : (
          <Check className="w-4 h-4 stroke-[3]" />
        )}
      </div>
    </>
  );
};
