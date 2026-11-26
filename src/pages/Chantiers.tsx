import { Navigate } from 'react-router-dom';
import { AlertCircle, Briefcase, Building, CheckCircle2, Plus, Search, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { getTodayDateString } from '../lib/db';
import { useChantiersCatalog } from '../hooks/useChantiersCatalog';
import { ChantierCard } from '../components/chantiers/ChantierCard';
import { ChantierFormModal } from '../components/chantiers/ChantierFormModal';
import { ChantierAssignModal } from '../components/chantiers/ChantierAssignModal';

export function Chantiers() {
  const { profile } = useAuth();
  const catalog = useChantiersCatalog();
  const todayStr = getTodayDateString(0);

  if (profile?.role === 'ouvrier') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-4 max-w-md mx-auto pb-12">
      {/* Toast de Notification */}
      {catalog.feedbackMessage && (
        <div
          className={`fixed top-4 left-4 right-4 z-50 max-w-md mx-auto text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ${
            catalog.feedbackType === 'error'
              ? 'bg-rose-900 border-rose-400/50'
              : 'bg-foret border-sable/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {catalog.feedbackType === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{catalog.feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => catalog.setFeedbackMessage(null)}
            aria-label="Fermer la notification"
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-2xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. En-tête de la Gestion des Chantiers */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-foret dark:bg-[#235852] text-sable dark:text-[#D5E6DC] flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-terracotta dark:text-[#E38D69]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-foret dark:text-[#EDF2F0] leading-tight truncate">
                Gestion des Chantiers
              </h1>
              <span className="text-xs text-foret/70 dark:text-[#B8C7C2] font-medium">
                {catalog.chantiers.length} chantier(s) au catalogue
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => catalog.setIsCreateModalOpen(true)}
            className="min-h-[48px] px-4 py-2.5 bg-foret hover:bg-foret/90 dark:bg-[#235852] dark:hover:bg-[#2B6962] active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-md shadow-foret/25 dark:shadow-none transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau chantier</span>
          </button>
        </div>

        {/* Barre de Recherche Instantanée */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foret/40 dark:text-[#8FA5A0] pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par client, adresse, travaux..."
            value={catalog.searchQuery}
            onChange={(e) => catalog.setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] bg-craie dark:bg-[#1E2E2C] text-xs text-foret dark:text-[#EDF2F0] placeholder:text-foret/40 dark:placeholder:text-[#8FA5A0] pl-10 pr-10 rounded-2xl border border-sable dark:border-[#304744] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40"
          />
          {catalog.searchQuery && (
            <button
              type="button"
              onClick={() => catalog.setSearchQuery('')}
              aria-label="Effacer la recherche"
              className="min-w-[48px] min-h-[48px] w-12 h-12 absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-foret/40 hover:text-foret dark:text-[#8FA5A0] dark:hover:text-[#EDF2F0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtres par Statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {(
            [
              { key: 'tous', label: 'Tous' },
              { key: 'en_cours', label: 'En cours' },
              { key: 'en_attente', label: 'En attente' },
              { key: 'termine', label: 'Terminés' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => catalog.setStatusFilter(tab.key)}
              className={`min-h-[48px] px-4 rounded-2xl font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center ${
                catalog.statusFilter === tab.key
                  ? 'bg-foret text-sable shadow-xs dark:bg-[#235852] dark:text-[#EDF2F0]'
                  : 'bg-craie text-foret/70 hover:text-foret border border-sable/60 dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0] dark:border-[#304744]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Liste des Chantiers */}
      {catalog.loading ? (
        <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-8 border border-sable dark:border-[#2A3F3C] text-center text-xs text-foret/60 dark:text-[#B8C7C2] shadow-soft">
          Chargement des chantiers...
        </div>
      ) : catalog.filteredChantiers.length === 0 ? (
        <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-8 border border-sable dark:border-[#2A3F3C] text-center space-y-2 shadow-soft">
          <Building className="w-8 h-8 mx-auto text-sauge/50 dark:text-[#9BB89B]/60" />
          <p className="text-xs font-bold text-foret dark:text-[#EDF2F0]">Aucun chantier trouvé</p>
          <p className="text-[11px] text-foret/60 dark:text-[#B8C7C2]">
            {catalog.searchQuery
              ? "Modifiez votre recherche pour voir d'autres résultats."
              : 'Cliquez sur « Nouveau chantier » pour en créer un.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {catalog.filteredChantiers.map((chantier) => (
            <ChantierCard
              key={chantier.id}
              chantier={chantier}
              affectations={catalog.affectations}
              profiles={catalog.profiles}
              todayStr={todayStr}
              onEdit={catalog.handleOpenEdit}
              onAssign={(c) => {
                catalog.setAssigningChantier(c);
                catalog.setAssignDate(getTodayDateString(0));
              }}
            />
          ))}
        </div>
      )}

      {/* MODALE DE CRÉATION */}
      {catalog.isCreateModalOpen && (
        <ChantierFormModal
          mode="create"
          form={catalog.createForm}
          onChange={catalog.setCreateForm}
          onClose={() => catalog.setIsCreateModalOpen(false)}
          onSubmit={catalog.handleCreateChantier}
        />
      )}

      {/* MODALE D'ÉDITION */}
      {catalog.editingChantier && (
        <ChantierFormModal
          mode="edit"
          form={catalog.editForm}
          onChange={catalog.setEditForm}
          onClose={() => catalog.setEditingChantier(null)}
          onSubmit={catalog.handleUpdateChantier}
        />
      )}

      {/* MODALE D'AFFECTATION */}
      {catalog.assigningChantier && (
        <ChantierAssignModal
          chantier={catalog.assigningChantier}
          profiles={catalog.profiles}
          affectations={catalog.affectations}
          assignDate={catalog.assignDate}
          onChangeDate={catalog.setAssignDate}
          onToggleWorker={catalog.handleToggleWorker}
          onClose={() => catalog.setAssigningChantier(null)}
        />
      )}
    </div>
  );
}
