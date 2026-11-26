import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db, getTodayDateString } from '../lib/db';
import { syncEngine } from '../lib/sync';
import { toggleWorkerAffectation, updateChantierStatut } from '../lib/chantiersService';
import type { Affectation, Chantier, ChantierStatut, Profile } from '../types/database';

export function useChantierDetail(id: string | undefined, profile: Profile | null) {
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [targetDate, setTargetDate] = useState<string>(() => getTodayDateString(0));
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionFeedbackType, setActionFeedbackType] = useState<'success' | 'error'>('success');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupervisor = profile?.role === 'chef_equipe' || profile?.role === 'admin';

  const showFeedback = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    setActionFeedbackType(type);
    setActionFeedback(msg);
    feedbackTimerRef.current = setTimeout(() => {
      setActionFeedback(null);
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

  const refreshChantierData = useCallback(async () => {
    if (!id) {
      setChantier(null);
      setLoading(false);
      return;
    }
    try {
      const [found, allAffs, allProfs] = await Promise.all([
        db.chantiers.get(id),
        db.affectations.where('chantier_id').equals(id).toArray(),
        db.profiles.toArray(),
      ]);

      if (found) {
        setChantier(found);
        setAffectations(allAffs);
        setAllProfiles(allProfs);

        const dayAffs = allAffs.filter((a) => a.date_intervention === targetDate);
        const profileIds = Array.from(new Set(dayAffs.map((a) => a.profile_id)));
        const activeMembers = allProfs.filter((p) => profileIds.includes(p.id));
        setTeamMembers(activeMembers);
      } else {
        setChantier(null);
        setAffectations([]);
        setTeamMembers([]);
      }
    } catch (err) {
      console.error('Erreur chargement chantier:', err);
    } finally {
      setLoading(false);
    }
  }, [id, targetDate]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await refreshChantierData();
    };
    void load();

    const unsub = syncEngine.subscribe(() => {
      if (isMounted) void refreshChantierData();
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [refreshChantierData]);

  const handleStatutChange = async (newStatut: ChantierStatut) => {
    if (!chantier) return;
    const res = await updateChantierStatut(chantier.id, newStatut);
    if (!res.ok) {
      showFeedback(res.error || 'Erreur lors de la mise à jour du statut', 'error');
      return;
    }

    setChantier((prev) => (prev ? { ...prev, statut: newStatut } : null));
    showFeedback('Statut du chantier mis à jour', 'success');
  };

  const handleToggleWorker = async (targetWorkerId: string) => {
    if (!chantier) return;

    const existingAff = affectations.find(
      (a) =>
        a.chantier_id === chantier.id &&
        a.profile_id === targetWorkerId &&
        a.date_intervention === targetDate
    );

    const res = await toggleWorkerAffectation({
      chantierId: chantier.id,
      profileId: targetWorkerId,
      dateIntervention: targetDate,
      existingAff,
    });

    if (!res.ok) {
      showFeedback(res.error || "Erreur lors de la modification de l'affectation", 'error');
      return;
    }

    showFeedback(
      res.data?.action === 'removed'
        ? 'Équipier retiré du chantier'
        : 'Équipier affecté au chantier',
      'success'
    );
    await refreshChantierData();
  };

  const assignedWorkerIdsForDate = useMemo(
    () => affectations.filter((a) => a.date_intervention === targetDate).map((a) => a.profile_id),
    [affectations, targetDate]
  );

  const isAssignedWorker = useMemo(() => {
    if (!profile || profile.role !== 'ouvrier') return true;
    return affectations.some((a) => a.profile_id === profile.id);
  }, [profile, affectations]);

  return {
    chantier,
    teamMembers,
    allProfiles,
    targetDate,
    setTargetDate,
    loading,
    actionFeedback,
    actionFeedbackType,
    isSupervisor,
    isAssignedWorker,
    assignedWorkerIdsForDate,
    handleStatutChange,
    handleToggleWorker,
  };
}
