import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db, getTodayDateString } from '../lib/db';
import { supabase } from '../lib/supabase';
import { syncEngine } from '../lib/sync';
import type { Chantier, Profile, Affectation, ChantierStatut } from '../types/database';
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  Calendar,
  Users,
  Edit3,
  UserCheck,
  X,
  Check,
  ChevronRight,
  Navigation,
  Clock,
  Building,
  CheckCircle2,
} from 'lucide-react';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function Chantiers() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'tous' | ChantierStatut>('tous');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);
  const [assigningChantier, setAssigningChantier] = useState<Chantier | null>(null);
  const [assignDate, setAssignDate] = useState(() => getTodayDateString(0));

  // Formulaire de création
  const [createForm, setCreateForm] = useState<{
    nom_client: string;
    adresse: string;
    statut: ChantierStatut;
    date_debut: string;
    date_fin: string;
    description: string;
  }>({
    nom_client: '',
    adresse: '',
    statut: 'en_cours',
    date_debut: getTodayDateString(0),
    date_fin: getTodayDateString(7),
    description: '',
  });

  // Formulaire d'édition
  const [editForm, setEditForm] = useState<{
    nom_client: string;
    adresse: string;
    statut: ChantierStatut;
    date_debut: string;
    date_fin: string;
    description: string;
  }>({
    nom_client: '',
    adresse: '',
    statut: 'en_cours',
    date_debut: '',
    date_fin: '',
    description: '',
  });

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [chData, prData, affData] = await Promise.all([
        db.chantiers.toArray(),
        db.profiles.toArray(),
        db.affectations.toArray(),
      ]);
      setChantiers(chData);
      setProfiles(prData);
      setAffectations(affData);
    } catch (err) {
      console.error('Erreur chargement chantiers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      if (isMounted) await loadData();
      if (navigator.onLine) {
        await syncEngine.pullRemoteData();
        if (isMounted) await loadData();
      }
    };
    fetchInitial();

    const unsub = syncEngine.subscribe(() => {
      if (isMounted) loadData();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [loadData]);

  // Filtrage des chantiers
  const filteredChantiers = useMemo(() => {
    return chantiers.filter((c) => {
      const matchesSearch =
        c.nom_client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.adresse.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'tous' ? true : c.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [chantiers, searchQuery, statusFilter]);

  // Handler de Création de Chantier
  const handleCreateChantier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nom_client.trim() || !createForm.adresse.trim()) {
      showFeedback('Veuillez renseigner le nom et l\'adresse');
      return;
    }

    const newId = generateUUID();
    const newChantier: Chantier = {
      id: newId,
      nom_client: createForm.nom_client.trim(),
      adresse: createForm.adresse.trim(),
      statut: createForm.statut,
      date_debut: createForm.date_debut || undefined,
      date_fin: createForm.date_fin || undefined,
      description: createForm.description.trim() || undefined,
    };

    try {
      // 1. Enregistrement Dexie immédiat (offline-first)
      await db.chantiers.put(newChantier);

      // 2. Synchronisation Supabase si en ligne
      if (navigator.onLine) {
        await supabase.from('chantiers').insert({
          id: newChantier.id,
          nom_client: newChantier.nom_client,
          adresse: newChantier.adresse,
          statut: newChantier.statut,
          date_debut: newChantier.date_debut || null,
          date_fin: newChantier.date_fin || null,
          description: newChantier.description || null,
        });
      }

      showFeedback('Nouveau chantier créé avec succès !');
      setIsCreateModalOpen(false);
      setCreateForm({
        nom_client: '',
        adresse: '',
        statut: 'en_cours',
        date_debut: getTodayDateString(0),
        date_fin: getTodayDateString(7),
        description: '',
      });
      await loadData();
    } catch (err) {
      console.error('Erreur création chantier:', err);
      showFeedback('Erreur lors de la création du chantier');
    }
  };

  // Handler d'Édition de Chantier
  const handleOpenEdit = (c: Chantier) => {
    setEditingChantier(c);
    setEditForm({
      nom_client: c.nom_client,
      adresse: c.adresse,
      statut: c.statut,
      date_debut: c.date_debut || '',
      date_fin: c.date_fin || '',
      description: c.description || '',
    });
  };

  const handleUpdateChantier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChantier) return;

    try {
      const updatedData: Partial<Chantier> = {
        nom_client: editForm.nom_client.trim(),
        adresse: editForm.adresse.trim(),
        statut: editForm.statut,
        date_debut: editForm.date_debut || undefined,
        date_fin: editForm.date_fin || undefined,
        description: editForm.description.trim() || undefined,
      };

      // 1. Dexie
      await db.chantiers.update(editingChantier.id, updatedData);

      // 2. Supabase
      if (navigator.onLine) {
        await supabase
          .from('chantiers')
          .update({
            nom_client: updatedData.nom_client,
            adresse: updatedData.adresse,
            statut: updatedData.statut,
            date_debut: updatedData.date_debut || null,
            date_fin: updatedData.date_fin || null,
            description: updatedData.description || null,
          })
          .eq('id', editingChantier.id);
      }

      showFeedback('Chantier mis à jour !');
      setEditingChantier(null);
      await loadData();
    } catch (err) {
      console.error('Erreur mise à jour chantier:', err);
      showFeedback('Erreur lors de la mise à jour');
    }
  };

  // Handler d'Affectation d'équipier
  const handleToggleWorker = async (workerId: string) => {
    if (!assigningChantier) return;

    const existingAff = affectations.find(
      (a) =>
        a.chantier_id === assigningChantier.id &&
        a.profile_id === workerId &&
        a.date_intervention === assignDate
    );

    try {
      if (existingAff) {
        // Retirer
        await db.affectations.delete(existingAff.id);
        if (navigator.onLine) {
          await supabase.from('affectations').delete().eq('id', existingAff.id);
        }
        showFeedback('Équipier retiré');
      } else {
        // Ajouter
        const newAff: Affectation = {
          id: generateUUID(),
          chantier_id: assigningChantier.id,
          profile_id: workerId,
          date_intervention: assignDate,
        };
        await db.affectations.put(newAff);
        if (navigator.onLine) {
          await supabase.from('affectations').insert({
            id: newAff.id,
            chantier_id: newAff.chantier_id,
            profile_id: newAff.profile_id,
            date_intervention: newAff.date_intervention,
          });
        }
        showFeedback('Équipier affecté');
      }
      await loadData();
    } catch (err) {
      console.error('Erreur affectation:', err);
      showFeedback('Erreur lors de l\'affectation');
    }
  };

  const getStatusBadge = (statut: ChantierStatut) => {
    switch (statut) {
      case 'en_cours':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En cours
          </span>
        );
      case 'en_attente':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            En attente
          </span>
        );
      case 'termine':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            Terminé
          </span>
        );
    }
  };

  const todayStr = getTodayDateString(0);

  return (
    <div className="space-y-4 pb-12">
      {/* Toast de Notification */}
      {feedbackMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-foret text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-sable/30 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. En-tête de la Gestion des Chantiers */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-foret text-sable flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-terracotta" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-foret leading-tight">
                Gestion des Chantiers
              </h1>
              <span className="text-[11px] text-foret/60">
                {chantiers.length} chantier(s) au catalogue
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-terracotta hover:bg-terracotta/90 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-terracotta/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau chantier</span>
          </button>
        </div>

        {/* Barre de Recherche Instantanée */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foret/40" />
          <input
            type="text"
            placeholder="Rechercher par client, adresse, travaux..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-craie text-xs text-foret pl-9 pr-8 py-2.5 rounded-xl border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foret/40 hover:text-foret"
            >
              <X className="w-3.5 h-3.5" />
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
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-foret text-sable shadow-xs'
                  : 'bg-craie text-foret/70 hover:text-foret border border-sable/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Liste des Chantiers */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-sable text-center text-xs text-foret/60">
          Chargement des chantiers...
        </div>
      ) : filteredChantiers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-sable text-center space-y-2">
          <Building className="w-8 h-8 mx-auto text-sauge/50" />
          <p className="text-xs font-bold text-foret">Aucun chantier trouvé</p>
          <p className="text-[11px] text-foret/60">
            {searchQuery
              ? 'Modifiez votre recherche pour voir d\'autres résultats.'
              : 'Cliquez sur « Nouveau chantier » pour en créer un.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChantiers.map((chantier) => {
            // Ouvriers affectés aujourd'hui sur ce chantier
            const todayAffs = affectations.filter(
              (a) => a.chantier_id === chantier.id && a.date_intervention === todayStr
            );
            const assignedWorkerNames = todayAffs
              .map((a) => {
                const p = profiles.find((prof) => prof.id === a.profile_id);
                return p ? `${p.prenom} ${p.nom.charAt(0)}.` : null;
              })
              .filter(Boolean);

            return (
              <div
                key={chantier.id}
                className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3 transition-all hover:border-sable"
              >
                {/* Ligne En-tête : Nom + Statut */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-foret leading-snug">
                      {chantier.nom_client}
                    </h2>
                    {chantier.date_debut && (
                      <span className="text-[10px] text-sauge flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-terracotta" />
                        <span>
                          {chantier.date_debut}
                          {chantier.date_fin ? ` au ${chantier.date_fin}` : ''}
                        </span>
                      </span>
                    )}
                  </div>
                  {getStatusBadge(chantier.statut)}
                </div>

                {/* Adresse cliquable */}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(chantier.adresse)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-1.5 text-xs text-foret/80 hover:text-terracotta transition-colors group"
                >
                  <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="underline-offset-2 group-hover:underline">
                    {chantier.adresse}
                  </span>
                  <Navigation className="w-3 h-3 ml-auto text-foret/40 group-hover:text-terracotta" />
                </a>

                {/* Description */}
                {chantier.description && (
                  <p className="text-xs text-foret/70 bg-craie p-2.5 rounded-xl border border-sable/50 line-clamp-2">
                    {chantier.description}
                  </p>
                )}

                {/* Équipiers affectés aujourd'hui */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-sable/40">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Users className="w-3.5 h-3.5 text-sauge shrink-0" />
                    {assignedWorkerNames.length > 0 ? (
                      <span className="text-[11px] font-semibold text-foret">
                        {assignedWorkerNames.join(', ')}
                      </span>
                    ) : (
                      <span className="text-[11px] text-foret/50 italic">
                        Aucun ouvrier affecté aujourd'hui
                      </span>
                    )}
                  </div>
                </div>

                {/* Boutons d'Action Rapide pour le Chef d'équipe */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(chantier)}
                    className="py-2 px-2 bg-craie hover:bg-sable/40 active:scale-95 text-foret font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-sable/70 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-terracotta" />
                    <span>Modifier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssigningChantier(chantier);
                      setAssignDate(getTodayDateString(0));
                    }}
                    className="py-2 px-2 bg-craie hover:bg-sable/40 active:scale-95 text-foret font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-sable/70 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Affecter</span>
                  </button>

                  <Link
                    to={`/chantier/${chantier.id}`}
                    className="py-2 px-2 bg-foret hover:bg-foret/90 active:scale-95 text-sable font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all"
                  >
                    <span>Détails</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DE CRÉATION DE CHANTIER                                            */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-sable pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-terracotta text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-extrabold text-foret">Créer un nouveau chantier</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 hover:bg-craie rounded-xl text-foret/60 hover:text-foret"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChantier} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foret mb-1">
                  Nom du client / Intitulé du projet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Villa Dupont - Terrasse & Gazon"
                  value={createForm.nom_client}
                  onChange={(e) => setCreateForm({ ...createForm, nom_client: e.target.value })}
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                />
              </div>

              <div>
                <label className="block font-bold text-foret mb-1">Adresse complète du chantier *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: 12 Rue des Lilas, 69000 Lyon"
                  value={createForm.adresse}
                  onChange={(e) => setCreateForm({ ...createForm, adresse: e.target.value })}
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                />
              </div>

              <div>
                <label className="block font-bold text-foret mb-1">Statut initial</label>
                <select
                  value={createForm.statut}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, statut: e.target.value as ChantierStatut })
                  }
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-bold"
                >
                  <option value="en_cours">🟢 En cours</option>
                  <option value="en_attente">🟡 En attente</option>
                  <option value="termine">⚪ Terminé</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foret mb-1">Date de début</label>
                  <input
                    type="date"
                    value={createForm.date_debut}
                    onChange={(e) => setCreateForm({ ...createForm, date_debut: e.target.value })}
                    className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foret mb-1">Date de fin prévisionnelle</label>
                  <input
                    type="date"
                    value={createForm.date_fin}
                    onChange={(e) => setCreateForm({ ...createForm, date_fin: e.target.value })}
                    className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foret mb-1">Description des travaux & consignes</label>
                <textarea
                  rows={3}
                  placeholder="Détails du projet, plantation, engins nécessaires, code portail..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-craie hover:bg-sable/50 text-foret font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta/90 text-white font-bold shadow-md shadow-terracotta/20 transition-all cursor-pointer"
                >
                  Créer le chantier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE D'ÉDITION DE CHANTIER                                              */}
      {/* ========================================================================= */}
      {editingChantier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-sable pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-foret text-sable flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-terracotta" />
                </div>
                <h2 className="text-sm font-extrabold text-foret">Modifier le chantier</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingChantier(null)}
                className="p-1.5 hover:bg-craie rounded-xl text-foret/60 hover:text-foret"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateChantier} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foret mb-1">Nom du client / Chantier *</label>
                <input
                  type="text"
                  required
                  value={editForm.nom_client}
                  onChange={(e) => setEditForm({ ...editForm, nom_client: e.target.value })}
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                />
              </div>

              <div>
                <label className="block font-bold text-foret mb-1">Adresse complète *</label>
                <input
                  type="text"
                  required
                  value={editForm.adresse}
                  onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                />
              </div>

              <div>
                <label className="block font-bold text-foret mb-1">Statut du chantier</label>
                <select
                  value={editForm.statut}
                  onChange={(e) =>
                    setEditForm({ ...editForm, statut: e.target.value as ChantierStatut })
                  }
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-bold"
                >
                  <option value="en_cours">🟢 En cours</option>
                  <option value="en_attente">🟡 En attente</option>
                  <option value="termine">⚪ Terminé</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foret mb-1">Date de début</label>
                  <input
                    type="date"
                    value={editForm.date_debut}
                    onChange={(e) => setEditForm({ ...editForm, date_debut: e.target.value })}
                    className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foret mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={editForm.date_fin}
                    onChange={(e) => setEditForm({ ...editForm, date_fin: e.target.value })}
                    className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foret mb-1">Description des travaux</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-craie p-2.5 rounded-xl border border-sable text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingChantier(null)}
                  className="px-4 py-2.5 rounded-xl bg-craie hover:bg-sable/50 text-foret font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-foret hover:bg-foret/90 text-white font-bold shadow-md transition-all cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE D'AFFECTATION D'ÉQUIPIERS                                         */}
      {/* ========================================================================= */}
      {assigningChantier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-sable pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-foret">Gérer les affectations</h2>
                  <p className="text-[11px] text-foret/60 truncate max-w-[220px]">
                    {assigningChantier.nom_client}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningChantier(null)}
                className="p-1.5 hover:bg-craie rounded-xl text-foret/60 hover:text-foret"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sélecteur de date d'intervention */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-foret flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-terracotta" />
                <span>Date d'intervention</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                  className="bg-craie p-2 rounded-xl border border-sable text-xs font-bold text-foret focus:outline-none focus:ring-2 focus:ring-foret/20"
                />
                <button
                  type="button"
                  onClick={() => setAssignDate(getTodayDateString(0))}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-sable/40 text-foret hover:bg-sable transition-colors cursor-pointer"
                >
                  Aujourd'hui
                </button>
              </div>
            </div>

            {/* Liste des équipiers avec toggle */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sauge block">
                Équipe disponible ({profiles.length})
              </span>

              <div className="space-y-1.5">
                {profiles.map((p) => {
                  const isAssigned = affectations.some(
                    (a) =>
                      a.chantier_id === assigningChantier.id &&
                      a.profile_id === p.id &&
                      a.date_intervention === assignDate
                  );

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleWorker(p.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer active:scale-98 ${
                        isAssigned
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : 'bg-craie/60 border-sable/60 text-foret hover:bg-craie'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isAssigned
                              ? 'bg-emerald-600 text-white'
                              : 'bg-foret/10 text-foret'
                          }`}
                        >
                          {p.prenom.charAt(0)}
                          {p.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none">
                            {p.prenom} {p.nom}
                          </p>
                          <span className="text-[10px] text-foret/60 capitalize">
                            {p.role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isAssigned
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-sable bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-sable">
              <button
                type="button"
                onClick={() => setAssigningChantier(null)}
                className="w-full py-2.5 rounded-xl bg-foret text-sable font-bold text-xs shadow-sm hover:bg-foret/90 transition-all cursor-pointer"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
