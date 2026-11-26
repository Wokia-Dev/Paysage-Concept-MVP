import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudUpload,
  FolderKanban,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useHomeDashboard } from '../hooks/useHomeDashboard';
import { formatHours } from '../lib/hours';
import { CircularProgressGauge } from '../components/common/CircularProgressGauge';
import { HoursAnalyticsSection } from '../components/common/HoursAnalyticsSection';
import { HomeHeader } from '../components/home/HomeHeader';
import { HeroChantierCard } from '../components/home/HeroChantierCard';
import { DailyTargetEditor } from '../components/home/DailyTargetEditor';
import { TimeDeclarationModal } from '../components/home/TimeDeclarationModal';
import { TeamDailySummaryCard } from '../components/home/TeamDailySummaryCard';
import { DailyDeclarationSummary } from '../components/home/DailyDeclarationSummary';

export function Home() {
  const { profile } = useAuth();
  const dashboard = useHomeDashboard(profile);
  const isSupervisor = profile?.role === 'chef_equipe' || profile?.role === 'admin';

  return (
    <div className="space-y-5 pb-32 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      {/* 1. Header Biophilique Vert Forêt unifié */}
      <HomeHeader
        profile={profile}
        weather={dashboard.weather}
        selectedDateStr={dashboard.selectedDateStr}
        onSelectDate={dashboard.setSelectedDateStr}
      />

      {/* Toast de succès d'enregistrement */}
      {dashboard.submitSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 dark:bg-emerald-950/75 dark:border-emerald-700/60 dark:text-emerald-200 flex items-center gap-2 shadow-soft animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="font-bold">Vos heures ont été enregistrées avec succès !</span>
        </div>
      )}

      {/* 2. Hero Chantier Card pour la prochaine intervention */}
      <HeroChantierCard
        activeHeroChantier={dashboard.activeHeroChantier}
        availableChantiers={dashboard.availableChantiers}
        selectedChantier={dashboard.selectedChantier}
        onSelectChantier={dashboard.setSelectedChantier}
      />

      {/* Raccourci superviseur : Gestion des chantiers */}
      {isSupervisor && (
        <Link
          to="/chantiers"
          className="group flex items-center justify-between p-4 bg-white hover:bg-craie dark:bg-[#172322] dark:hover:bg-[#1E2E2C] rounded-3xl border border-sable/80 hover:border-sauge dark:border-[#2A3F3C] dark:hover:border-[#4A6B66] shadow-soft min-h-[52px] transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-foret dark:bg-[#235852] text-sable dark:text-[#D5E6DC] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <FolderKanban className="w-5 h-5 text-sable dark:text-[#D5E6DC]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foret dark:text-[#EDF2F0] truncate">Gérer les chantiers</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sable/70 text-foret/80 border border-sable dark:bg-[#263A37] dark:text-[#B8C7C2] dark:border-[#38524E] shrink-0">
                  Supervision
                </span>
              </div>
              <p className="text-[11px] text-sauge dark:text-[#9BB89B] font-medium truncate mt-0.5">
                Accéder à la gestion globale et affectations
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-craie group-hover:bg-sable/40 dark:bg-[#1E2E2C] dark:group-hover:bg-[#263A37] flex items-center justify-center shrink-0 ml-2 transition-colors">
            <ChevronRight className="w-4 h-4 text-foret/60 group-hover:text-foret dark:text-[#B8C7C2] dark:group-hover:text-[#EDF2F0] group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      )}

      {/* 3. Bandeau widgets & Suivi des heures */}
      <section className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-5">
        <div className="flex items-center justify-between border-b border-sable/50 dark:border-[#2A3F3C] pb-3">
          <div>
            <h2 className="text-lg font-bold text-foret dark:text-[#EDF2F0] tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-terracotta dark:text-[#E38D69]" />
              Suivi des heures
            </h2>
            <p className="text-xs text-sauge dark:text-[#9BB89B]">Objectif quotidien & déclaration instantanée</p>
          </div>

          {dashboard.todayPointage && (
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                dashboard.todayPointage.synced
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border dark:border-emerald-700/60'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/75 dark:text-amber-300 dark:border dark:border-amber-700/60'
              }`}
            >
              {dashboard.todayPointage.synced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Synchronisé
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  En attente synchro
                </>
              )}
            </span>
          )}
        </div>

        {/* Jauge circulaire fer à cheval */}
        <div
          onClick={dashboard.handleOpenSaisie}
          className="py-2 flex flex-col items-center space-y-2 cursor-pointer group"
          title="Cliquer pour saisir ou modifier vos heures"
        >
          <div className="group-hover:scale-[1.02] transition-transform">
            <CircularProgressGauge
              value={dashboard.activeHours}
              target={dashboard.dailyTarget}
              size={220}
              strokeWidth={18}
              onEditTarget={(e) => {
                e?.stopPropagation?.();
                dashboard.setIsEditingTarget((prev) => !prev);
              }}
              isEditingTarget={dashboard.isEditingTarget}
            />
          </div>

          {dashboard.hasSubmittedToday ? (
            <div className="text-xs text-foret/70 dark:text-[#B8C7C2] text-center font-medium bg-craie dark:bg-[#1E2E2C] px-3.5 py-1.5 rounded-full border border-sable/60 dark:border-[#304744] shadow-2xs">
              {formatHours(dashboard.activeNormal)} normales + {formatHours(dashboard.activeSup)}{' '}
              sup
              {dashboard.activePause > 0 && ` • Pause : ${formatHours(dashboard.activePause)}`}
            </div>
          ) : (
            <div className="text-xs text-sauge dark:text-[#9BB89B] text-center font-medium bg-craie/60 dark:bg-[#1E2E2C] px-3.5 py-1.5 rounded-full border border-sable/40 dark:border-[#304744]">
              Aucune heure déclarée pour cette date (0h 00)
            </div>
          )}
        </div>

        {/* Panneau d'ajustement inline de l'objectif journalier */}
        {dashboard.isEditingTarget && (
          <DailyTargetEditor
            dailyTarget={dashboard.dailyTarget}
            onChangeTarget={dashboard.handleTargetChange}
            onClose={() => dashboard.setIsEditingTarget(false)}
          />
        )}

        {/* Bouton CTA Principal */}
        <button
          type="button"
          onClick={dashboard.handleOpenSaisie}
          aria-label={dashboard.hasSubmittedToday ? 'Modifier mes heures' : '+ Saisir des heures'}
          className="w-full min-h-[48px] h-14 bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] dark:border dark:border-[#397A75]/55 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-foret/25 dark:shadow-none active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{dashboard.hasSubmittedToday ? 'Modifier mes heures' : 'Saisir des heures'}</span>
        </button>
      </section>

      {/* 4. Modale / Bottom Sheet de Déclaration des heures */}
      {dashboard.isModalOpen && (
        <TimeDeclarationModal
          selectedDateStr={dashboard.selectedDateStr}
          todayPointage={dashboard.todayPointage}
          dailyTarget={dashboard.dailyTarget}
          heureDebut={dashboard.heureDebut}
          heureFin={dashboard.heureFin}
          tempsPause={dashboard.tempsPause}
          heuresSup={dashboard.heuresSup}
          heuresTotales={dashboard.heuresTotales}
          calculatedAmplitude={dashboard.calculatedAmplitude}
          isSupManuallyEdited={dashboard.isSupManuallyEdited}
          showAdvancedDetails={dashboard.showAdvancedDetails}
          validationError={dashboard.validationError}
          isSubmitting={dashboard.isSubmitting}
          lastUsedTimeRange={dashboard.lastUsedTimeRange}
          onClose={dashboard.handleCloseModal}
          onToggleAdvanced={() => dashboard.setShowAdvancedDetails((prev) => !prev)}
          onDebutChange={dashboard.handleDebutChange}
          onFinChange={dashboard.handleFinChange}
          onPauseChange={dashboard.handlePauseChange}
          onSupChange={dashboard.handleSupChange}
          onRealignSup={dashboard.handleRealignSup}
          onApplyPresetRange={dashboard.handleApplyPresetRange}
          onSubmit={dashboard.handleSubmit}
        />
      )}

      {/* 5. Espace Superviseur : Suivi des pointages de l'équipe */}
      {isSupervisor && (
        <TeamDailySummaryCard
          selectedDateStr={dashboard.selectedDateStr}
          teamSummary={dashboard.teamSummary}
          teamStatuses={dashboard.teamStatuses}
          allChantiers={dashboard.allChantiers}
        />
      )}

      {/* 6. Récapitulatif de ma déclaration journalière */}
      <DailyDeclarationSummary todayPointage={dashboard.todayPointage} />

      {/* 7. Analyse & Historique des heures */}
      <HoursAnalyticsSection
        pointages={dashboard.userAllPointages}
        chantiers={dashboard.allChantiers}
        dailyTarget={dashboard.dailyTarget}
        selectedDateStr={dashboard.selectedDateStr}
        onSelectDate={dashboard.setSelectedDateStr}
        onOpenSaisie={dashboard.handleOpenSaisie}
      />
    </div>
  );
}
