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
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-foret text-sable flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-terracotta" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-foret leading-tight truncate">
                Gestion des Chantiers
              </h1>
              <span className="text-xs text-foret/70 font-medium">
                {catalog.chantiers.length} chantier(s) au catalogue
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => catalog.setIsCreateModalOpen(true)}
            className="min-h-[48px] px-4 py-2.5 bg-foret hover:bg-foret/90 active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-md shadow-foret/25 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau chantier</span>
          </button>
        </div>

        {/* Barre de Recherche Instantanée */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foret/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par client, adresse, travaux..."
            value={catalog.searchQuery}
            onChange={(e) => catalog.setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] bg-craie text-xs text-foret pl-10 pr-10 rounded-2xl border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20"
          />
          {catalog.searchQuery && (
            <button
              type="button"
              onClick={() => catalog.setSearchQuery('')}
              aria-label="Effacer la recherche"
              className="min-w-[48px] min-h-[48px] w-12 h-12 absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-foret/40 hover:text-foret cursor-pointer"
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
                  ? 'bg-foret text-sable shadow-xs'
                  : 'bg-craie text-foret/70 hover:text-foret border border-sable/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Liste des Chantiers */}
      {catalog.loading ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-8 border border-sable text-center text-xs text-foret/60 shadow-soft">
          Chargement des chantiers...
        </div>
      ) : catalog.filteredChantiers.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-8 border border-sable text-center space-y-2 shadow-soft">
          <Building className="w-8 h-8 mx-auto text-sauge/50" />
          <p className="text-xs font-bold text-foret">Aucun chantier trouvé</p>
          <p className="text-[11px] text-foret/60">
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
