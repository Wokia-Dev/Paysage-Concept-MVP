-- ==============================================================================
-- PAYSAGE CONCEPT - MIGRATION : PLAGES HORAIRES SUR LES POINTAGES
-- Ajout des colonnes heure_debut et heure_fin à public.pointages
-- À exécuter dans le "SQL Editor" de votre tableau de bord Supabase :
-- https://supabase.com/dashboard/project/cxcvngmniodppirpzzdz/sql
-- ==============================================================================

BEGIN;

-- 1. Ajout des colonnes heure_debut et heure_fin (type TIME sans fuseau)
ALTER TABLE public.pointages
  ADD COLUMN IF NOT EXISTS heure_debut TIME NULL,
  ADD COLUMN IF NOT EXISTS heure_fin TIME NULL;

COMMENT ON COLUMN public.pointages.heure_debut IS 'Heure d''arrivée au travail (ex: 08:00:00)';
COMMENT ON COLUMN public.pointages.heure_fin IS 'Heure de départ du travail (ex: 16:30:00)';

COMMIT;

