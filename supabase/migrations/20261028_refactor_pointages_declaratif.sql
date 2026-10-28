-- ==============================================================================
-- PAYSAGE CONCEPT - MIGRATION DU SYSTÈME DE POINTAGE
-- Passage au système déclaratif journalier (heures totales, pause, heures sup)
-- À exécuter dans le "SQL Editor" de votre tableau de bord Supabase :
-- https://supabase.com/dashboard/project/cxcvngmniodppirpzzdz/sql
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. SUPPRESSION DE L'ANCIENNE TABLE ET DE L'ÉNUMÉRATEUR OBSOLÈTE
-- ------------------------------------------------------------------------------

-- Suppression de la table existante et de ses dépendances (triggers, index, policies)
DROP TABLE IF EXISTS public.pointages CASCADE;

-- Suppression de l'enum obsolète (arrivee, pause, reprise, depart)
DROP TYPE IF EXISTS public.pointage_type CASCADE;

-- ------------------------------------------------------------------------------
-- 2. CRÉATION DE LA NOUVELLE TABLE PUBLIC.POINTAGES
-- ------------------------------------------------------------------------------

CREATE TABLE public.pointages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  heures_totales NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  temps_pause NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  heures_sup NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  synchronise_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contraintes de cohérence métier
  CONSTRAINT pointages_heures_totales_positive CHECK (heures_totales >= 0 AND heures_totales <= 24),
  CONSTRAINT pointages_temps_pause_positive CHECK (temps_pause >= 0 AND temps_pause <= 24),
  CONSTRAINT pointages_heures_sup_positive CHECK (heures_sup >= 0 AND heures_sup <= 24),
  CONSTRAINT pointages_heures_sup_le_totales CHECK (heures_sup <= heures_totales),

  -- Contrainte d'unicité journalière pour supporter les opérations UPSERT (anti-doublon)
  CONSTRAINT pointages_profile_date_unique UNIQUE (profile_id, date)
);

-- Commentaires explicatifs sur les colonnes
COMMENT ON TABLE public.pointages IS 'Déclarations journalières des heures travaillées par employé';
COMMENT ON COLUMN public.pointages.heures_totales IS 'Total des heures prestées dans la journée (ex: 8.00 ou 7.50)';
COMMENT ON COLUMN public.pointages.temps_pause IS 'Durée totale des pauses / déjeuner (ex: 1.00 pour 1h)';
COMMENT ON COLUMN public.pointages.heures_sup IS 'Heures supplémentaires incluses (doit être <= heures_totales)';

-- ------------------------------------------------------------------------------
-- 3. INDEX DE PERFORMANCE
-- ------------------------------------------------------------------------------

CREATE INDEX idx_pointages_profile_date ON public.pointages(profile_id, date);
CREATE INDEX idx_pointages_date ON public.pointages(date);
CREATE INDEX idx_pointages_chantier_id ON public.pointages(chantier_id);
CREATE INDEX idx_pointages_profile_id ON public.pointages(profile_id);

-- ------------------------------------------------------------------------------
-- 4. DÉCLENCHEUR AUTOMATIQUE POUR UPDATED_AT
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pointages_updated_at ON public.pointages;
CREATE TRIGGER trg_pointages_updated_at
BEFORE UPDATE ON public.pointages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE public.pointages ENABLE ROW LEVEL SECURITY;

-- Suppression préventive des anciennes politiques si existantes
DROP POLICY IF EXISTS "Authenticated users can view pointages" ON public.pointages;
DROP POLICY IF EXISTS "Users can insert own pointages" ON public.pointages;
DROP POLICY IF EXISTS "pointages_select_policy" ON public.pointages;
DROP POLICY IF EXISTS "pointages_insert_policy" ON public.pointages;
DROP POLICY IF EXISTS "pointages_update_policy" ON public.pointages;
DROP POLICY IF EXISTS "pointages_delete_policy" ON public.pointages;

-- 5.1. Lecture : tout utilisateur authentifié peut consulter les pointages (reporting / supervision)
CREATE POLICY "pointages_select_policy"
ON public.pointages FOR SELECT
TO authenticated
USING (true);

-- 5.2. Insertion : propre profil ou chef d'équipe / admin
CREATE POLICY "pointages_insert_policy"
ON public.pointages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = profile_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('chef_equipe', 'admin')
  )
);

-- 5.3. Mise à jour / Upsert (CRITIQUE : requise par PostgreSQL pour ON CONFLICT DO UPDATE)
CREATE POLICY "pointages_update_policy"
ON public.pointages FOR UPDATE
TO authenticated
USING (
  auth.uid() = profile_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('chef_equipe', 'admin')
  )
)
WITH CHECK (
  auth.uid() = profile_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('chef_equipe', 'admin')
  )
);

-- 5.4. Suppression : propre profil ou chef d'équipe / admin
CREATE POLICY "pointages_delete_policy"
ON public.pointages FOR DELETE
TO authenticated
USING (
  auth.uid() = profile_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('chef_equipe', 'admin')
  )
);

COMMIT;
