import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db, getTodayDateString } from '../lib/db';
import { syncEngine } from '../lib/sync';
import {
  applyBatchAffectations,
  createChantier,
  toggleWorkerAffectation,
  updateChantier,
  type BatchAffectationPayload,
  type ChantierFormInput,
} from '../lib/chantiersService';
import { formatBatchAffectationFeedback } from '../lib/affectationsUtils';
import type { Affectation, Chantier, ChantierStatut, Profile } from '../types/database';

function getDefaultCreateForm(): ChantierFormInput {
  return {
    nom_client: '',
    adresse: '',
    statut: 'en_cours',
    date_debut: getTodayDateString(0),
    date_fin: getTodayDateString(7),
    description: '',
  };
}

export function useChantiersCatalog() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'tous' | ChantierStatut>('tous');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);
  const [assigningChantier, setAssigningChantier] = useState<Chantier | null>(null);
  const [assignDate, setAssignDate] = useState(() => getTodayDateString(0));

  const [createForm, setCreateForm] = useState<ChantierFormInput>(getDefaultCreateForm);
  const [editForm, setEditForm] = useState<ChantierFormInput>({
    nom_client: '',
    adresse: '',
    statut: 'en_cours',
    date_debut: '',
    date_fin: '',
    description: '',
  });

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    setFeedbackType(type);
    setFeedbackMessage(msg);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMessage(null);
      feedbackTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

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
    const init = async () => {
      if (isMounted) await loadData();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await syncEngine.pullRemoteData();
      }
    };
    void init();

    const unsub = syncEngine.subscribe(() => {
      if (isMounted) void loadData();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [loadData]);

  const filteredChantiers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return chantiers.filter((c) => {
      const matchesSearch =
        c.nom_client.toLowerCase().includes(q) ||
        c.adresse.toLowerCase().includes(q) ||
        Boolean(c.description && c.description.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'tous' ? true : c.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [chantiers, searchQuery, statusFilter]);

  const handleCreateChantier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nom_client.trim() || !createForm.adresse.trim()) {
      showFeedback("Veuillez renseigner le nom et l'adresse", 'error');
      return;
    }

    const res = await createChantier(createForm);
    if (!res.ok) {
      showFeedback(res.error || 'Erreur lors de la création du chantier', 'error');
      return;
    }

    showFeedback('Nouveau chantier créé avec succès !', 'success');
    setIsCreateModalOpen(false);
    setCreateForm(getDefaultCreateForm());
    await loadData();
  };

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
    if (!editForm.nom_client.trim() || !editForm.adresse.trim()) {
      showFeedback("Veuillez renseigner le nom et l'adresse", 'error');
      return;
    }

    const res = await updateChantier(editingChantier.id, editForm);
    if (!res.ok) {
      showFeedback(res.error || 'Erreur lors de la mise à jour', 'error');
      return;
    }

    showFeedback('Chantier mis à jour !', 'success');
    setEditingChantier(null);
    await loadData();
  };

  const handleToggleWorker = async (workerId: string) => {
    if (!assigningChantier) return;

    const existingAff = affectations.find(
      (a) =>
        a.chantier_id === assigningChantier.id &&
        a.profile_id === workerId &&
        a.date_intervention === assignDate
    );

    const res = await toggleWorkerAffectation({
      chantierId: assigningChantier.id,
      profileId: workerId,
      dateIntervention: assignDate,
      existingAff,
    });

    if (!res.ok) {
      showFeedback(res.error || "Erreur lors de l'affectation", 'error');
      return;
    }

    showFeedback(
      res.data?.action === 'removed' ? 'Équipier retiré' : 'Équipier affecté',
      'success'
    );
    await loadData();
  };

  const handleApplyBatchAffectations = async (
    payload: BatchAffectationPayload
  ): Promise<boolean> => {
    const res = await applyBatchAffectations(payload);
    if (!res.ok) {
      showFeedback(res.error || "Erreur lors de la mise à jour des affectations", 'error');
      return false;
    }

    const added = res.data?.addedCount ?? 0;
    const removed = res.data?.removedCount ?? 0;
    showFeedback(formatBatchAffectationFeedback(added, removed), 'success');

    await loadData();
    return true;
  };

  return {
    chantiers,
    profiles,
    affectations,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredChantiers,
    isCreateModalOpen,
    setIsCreateModalOpen,
    editingChantier,
    setEditingChantier,
    assigningChantier,
    setAssigningChantier,
    assignDate,
    setAssignDate,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    feedbackMessage,
    feedbackType,
    setFeedbackMessage,
    handleCreateChantier,
    handleOpenEdit,
    handleUpdateChantier,
    handleToggleWorker,
    handleApplyBatchAffectations,
  };
}
