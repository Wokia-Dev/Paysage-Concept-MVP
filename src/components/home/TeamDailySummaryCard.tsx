import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Chantier } from '../../types/database';
import { calculateNormalHours, formatHours, type WorkerDailyStatus } from '../../lib/hours';
import type { TeamSummaryMetrics } from '../../hooks/useHomeDashboard';

interface TeamDailySummaryCardProps {
  selectedDateStr: string;
  teamSummary: TeamSummaryMetrics;
  teamStatuses: WorkerDailyStatus[];
  allChantiers: Chantier[];
}

export const TeamDailySummaryCard: React.FC<TeamDailySummaryCardProps> = ({
  selectedDateStr,
  teamSummary,
  teamStatuses,
  allChantiers,
}) => {
  return (
    <section className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Suivi de l'équipe ({selectedDateStr})
        </span>
        <span className="text-xs text-foret/60 dark:text-[#B8C7C2] font-semibold">
          {teamSummary.submittedCount} / {teamSummary.workersCount} déclarés
        </span>
      </div>

      {/* Synthèse globale équipe */}
      <div className="grid grid-cols-2 gap-2.5 bg-craie dark:bg-[#1E2E2C] p-3.5 rounded-2xl border border-sable/60 dark:border-[#304744] text-xs">
        <div>
          <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium block">Total heures équipe :</span>
          <span className="text-lg font-extrabold text-foret dark:text-[#EDF2F0]">
            {formatHours(teamSummary.totalTeamHours)}
          </span>
          <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium block">
            ({formatHours(teamSummary.totalNormalHours)} norm. +{' '}
            {formatHours(teamSummary.totalOvertime)} sup)
          </span>
        </div>
        <div>
          <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium block">Dont heures sup :</span>
          <span className="text-lg font-extrabold text-terracotta dark:text-[#E38D69]">
            {formatHours(teamSummary.totalOvertime)}
          </span>
          <span className="text-[10px] text-sauge dark:text-[#9BB89B] font-medium block">Incluses dans le total</span>
        </div>
      </div>

      {/* Liste détaillée des ouvriers */}
      <div className="divide-y divide-sable/50 dark:divide-[#2A3F3C]">
        {teamStatuses.map((m) => {
          const matchedChantier = m.chantierId
            ? allChantiers.find((c) => c.id === m.chantierId)
            : undefined;

          return (
            <div key={m.profile.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-foret dark:bg-[#235852] text-sable dark:text-[#D5E6DC] font-bold text-xs flex items-center justify-center">
                  {m.profile.prenom.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-foret dark:text-[#EDF2F0]">
                    {m.profile.prenom} {m.profile.nom}
                  </p>
                  <p className="text-[10px] text-foret/60 dark:text-[#B8C7C2] truncate max-w-[150px]">
                    {matchedChantier?.nom_client || 'Aucun chantier'}
                  </p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <span
                  className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    m.hasSubmitted
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border dark:border-emerald-700/60'
                      : 'bg-sable/60 text-foret/60 dark:bg-[#263A37] dark:text-[#9BB89B]'
                  }`}
                >
                  {m.hasSubmitted
                    ? `🟢 ${formatHours(m.heuresTotales)} au total`
                    : '⚪ Non déclaré'}
                </span>
                {m.hasSubmitted && (
                  <p className="text-[10px] font-semibold text-foret/70 dark:text-[#B8C7C2]">
                    {formatHours(calculateNormalHours(m.heuresTotales, m.heuresSup))} norm. +{' '}
                    {formatHours(m.heuresSup)} sup
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
