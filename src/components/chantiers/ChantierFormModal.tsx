import React from 'react';
import { Edit3, Plus, X } from 'lucide-react';
import type { ChantierStatut } from '../../types/database';
import type { ChantierFormInput } from '../../lib/chantiersService';

interface ChantierFormModalProps {
  mode: 'create' | 'edit';
  form: ChantierFormInput;
  onChange: (next: ChantierFormInput) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChantierFormModal: React.FC<ChantierFormModalProps> = ({
  mode,
  form,
  onChange,
  onClose,
  onSubmit,
}) => {
  const isCreate = mode === 'create';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-sable pb-3">
          <div className="flex items-center gap-2.5">
            {isCreate ? (
              <div className="w-10 h-10 rounded-2xl bg-terracotta text-white flex items-center justify-center shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-foret text-sable flex items-center justify-center shadow-xs">
                <Edit3 className="w-5 h-5 text-terracotta" />
              </div>
            )}
            <h2 className="text-base font-extrabold text-foret">
              {isCreate ? 'Créer un nouveau chantier' : 'Modifier le chantier'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center hover:bg-craie rounded-2xl text-foret/60 hover:text-foret cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-foret mb-1.5">
              {isCreate ? 'Nom du client / Intitulé du projet *' : 'Nom du client / Chantier *'}
            </label>
            <input
              type="text"
              required
              placeholder={isCreate ? 'ex: Villa Dupont - Terrasse & Gazon' : undefined}
              value={form.nom_client}
              onChange={(e) => onChange({ ...form, nom_client: e.target.value })}
              className="w-full min-h-[48px] bg-craie px-3.5 py-2.5 rounded-2xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
            />
          </div>

          <div>
            <label className="block font-bold text-foret mb-1.5">
              {isCreate ? 'Adresse complète du chantier *' : 'Adresse complète *'}
            </label>
            <input
              type="text"
              required
              placeholder={isCreate ? 'ex: 12 Rue des Lilas, 69000 Lyon' : undefined}
              value={form.adresse}
              onChange={(e) => onChange({ ...form, adresse: e.target.value })}
              className="w-full min-h-[48px] bg-craie px-3.5 py-2.5 rounded-2xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
            />
          </div>

          <div>
            <label className="block font-bold text-foret mb-1.5">
              {isCreate ? 'Statut initial' : 'Statut du chantier'}
            </label>
            <select
              value={form.statut}
              onChange={(e) => onChange({ ...form, statut: e.target.value as ChantierStatut })}
              className="w-full min-h-[48px] bg-craie px-3.5 py-2.5 rounded-2xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-bold"
            >
              <option value="en_cours">🟢 En cours</option>
              <option value="en_attente">🟡 En attente</option>
              <option value="termine">⚪ Terminé</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-foret mb-1.5">Date de début</label>
              <input
                type="date"
                value={form.date_debut || ''}
                onChange={(e) => onChange({ ...form, date_debut: e.target.value })}
                className="w-full min-h-[48px] bg-craie px-3 py-2 rounded-2xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-foret mb-1.5">
                {isCreate ? 'Date de fin prévisionnelle' : 'Date de fin'}
              </label>
              <input
                type="date"
                value={form.date_fin || ''}
                onChange={(e) => onChange({ ...form, date_fin: e.target.value })}
                className="w-full min-h-[48px] bg-craie px-3 py-2 rounded-2xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-foret mb-1.5">
              {isCreate ? 'Description des travaux & consignes' : 'Description des travaux'}
            </label>
            <textarea
              rows={isCreate ? 3 : 4}
              placeholder={
                isCreate
                  ? 'Détails du projet, plantation, engins nécessaires, code portail...'
                  : undefined
              }
              value={form.description || ''}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              className="w-full bg-craie p-3 rounded-2xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-craie hover:bg-sable/50 text-foret font-bold transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`min-h-[48px] px-6 py-3 rounded-2xl bg-foret hover:bg-foret/90 text-white font-bold transition-all cursor-pointer ${
                isCreate ? 'shadow-md shadow-foret/25' : 'shadow-md'
              }`}
            >
              {isCreate ? 'Créer le chantier' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
