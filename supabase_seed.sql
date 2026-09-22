-- ==============================================================================
-- PAYSAGE CONCEPT - RÉINITIALISATION PROPRE & AMORÇAGE COMPLET SUPABASE
-- À exécuter dans le "SQL Editor" de votre tableau de bord Supabase :
-- https://supabase.com/dashboard/project/cxcvngmniodppirpzzdz/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PURGE PROPRE DE TOUTES LES DONNÉES EXISTANTES
-- (Respecte l'ordre des contraintes de clés étrangères)
-- ------------------------------------------------------------------------------

-- Supprimer tous les pointages
DELETE FROM public.pointages;

-- Supprimer toutes les affectations de chantiers
DELETE FROM public.affectations;

-- Supprimer tous les chantiers
DELETE FROM public.chantiers;

-- Supprimer tous les profils sauf les 2 utilisateurs de test principaux
DELETE FROM public.profiles
WHERE id NOT IN (
  '4fa02732-58a2-4de7-872f-1db234899c1e', -- Jean Dupont
  'd587499d-3f96-4164-b37f-01b7a442646b'  -- Marc Vasseur
);

-- Supprimer tous les autres utilisateurs dans auth.users (sauf Jean et Marc)
DELETE FROM auth.users
WHERE id NOT IN (
  '4fa02732-58a2-4de7-872f-1db234899c1e', -- Jean Dupont
  'd587499d-3f96-4164-b37f-01b7a442646b'  -- Marc Vasseur
);

-- Confirmer immédiatement les emails de Jean et Marc
UPDATE auth.users
SET email_confirmed_at = now()
WHERE id IN (
  '4fa02732-58a2-4de7-872f-1db234899c1e',
  'd587499d-3f96-4164-b37f-01b7a442646b'
);

-- ------------------------------------------------------------------------------
-- 2. CRÉATION DES 3 AUTRES OUVRIERS DANS AUTH.USERS (AVEC MOT DE PASSE DUPLIQUÉ)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_pwd text;
  v_instance uuid;
BEGIN
  -- Récupérer le hash du mot de passe (Paysage2026!) et l'instance_id de Jean Dupont
  SELECT encrypted_password, instance_id INTO v_pwd, v_instance
  FROM auth.users
  WHERE id = '4fa02732-58a2-4de7-872f-1db234899c1e'
  LIMIT 1;

  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-4000-8000-000000000000'::uuid;
  END IF;

  -- 1) Thomas Bernard (Ouvrier)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    'b3000000-0000-4000-8000-000000000003',
    v_instance,
    'thomas.bernard@paysageconcept.fr',
    COALESCE(v_pwd, '$2a$10$wE1V6J2/bH9eWvGj.QO/5Oi1u0H7yB6V7Zt9W1iE.dK6Z0i9fP5y2'),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Thomas","nom":"Bernard"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed_at = now();

  -- 2) Lucas Moreau (Ouvrier)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    'b4000000-0000-4000-8000-000000000004',
    v_instance,
    'lucas.moreau@paysageconcept.fr',
    COALESCE(v_pwd, '$2a$10$wE1V6J2/bH9eWvGj.QO/5Oi1u0H7yB6V7Zt9W1iE.dK6Z0i9fP5y2'),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Lucas","nom":"Moreau"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed_at = now();

  -- 3) Antoine Petit (Ouvrier)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    'b5000000-0000-4000-8000-000000000005',
    v_instance,
    'antoine.petit@paysageconcept.fr',
    COALESCE(v_pwd, '$2a$10$wE1V6J2/bH9eWvGj.QO/5Oi1u0H7yB6V7Zt9W1iE.dK6Z0i9fP5y2'),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Antoine","nom":"Petit"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed_at = now();
END $$;

-- ------------------------------------------------------------------------------
-- 3. INSERTION DES 5 PROFILS DANS PUBLIC.PROFILES
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, nom, prenom, telephone, role)
VALUES
  (
    '4fa02732-58a2-4de7-872f-1db234899c1e',
    'Dupont',
    'Jean',
    '06 12 34 56 78',
    'ouvrier'
  ),
  (
    'd587499d-3f96-4164-b37f-01b7a442646b',
    'Vasseur',
    'Marc',
    '06 98 76 54 32',
    'chef_equipe'
  ),
  (
    'b3000000-0000-4000-8000-000000000003',
    'Bernard',
    'Thomas',
    '06 45 67 89 01',
    'ouvrier'
  ),
  (
    'b4000000-0000-4000-8000-000000000004',
    'Moreau',
    'Lucas',
    '06 23 45 67 89',
    'ouvrier'
  ),
  (
    'b5000000-0000-4000-8000-000000000005',
    'Petit',
    'Antoine',
    '06 34 56 78 90',
    'ouvrier'
  )
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  telephone = EXCLUDED.telephone,
  role = EXCLUDED.role;

-- ------------------------------------------------------------------------------
-- 4. INSERTION DES 4 CHANTIERS
-- ------------------------------------------------------------------------------
INSERT INTO public.chantiers (id, nom_client, adresse, statut, date_debut, date_fin, description)
VALUES
  (
    'c1000000-0000-4000-8000-000000000001',
    'Villa Laurent - Jardin Zen & Terrasse Bois',
    '14 Chemin des Côtes, 69370 Saint-Didier-au-Mont-d''Or',
    'en_cours',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '12 days',
    'Pose d''enrochements en granit, plantation d''érables du Japon et réalisation d''une terrasse en bois ipé de 45m². Prévoir motoculteur et mini-pelle.'
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    'Résidence Les Cèdres - Taille & Engazonnement',
    '28 Avenue du Général Leclerc, 69300 Caluire-et-Cuire',
    'en_cours',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '4 days',
    'Rabattage de haie de thuyas sur 120m linéaires, broyage et évacuation des végétaux, préparation du sol et engazonnement rustique.'
  ),
  (
    'c3000000-0000-4000-8000-000000000003',
    'Domaine Beauvallon - Arrosage & Massifs',
    '5 Rue des Écureuils, 69570 Dardilly',
    'en_attente',
    CURRENT_DATE + INTERVAL '4 days',
    CURRENT_DATE + INTERVAL '14 days',
    'Tranchées légères pour arrosage automatique Rain Bird 4 zones, raccordement électrovannes et plantations de 350 vivaces mellifères avec paillage chanvre.'
  ),
  (
    'c4000000-0000-4000-8000-000000000004',
    'Parc Techlid - Bassin d''agrément & Pavage',
    '120 Allée des Chênes, 69760 Limonest',
    'en_cours',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '9 days',
    'Pavage carrossable en dalles grès cérame, création d''un bassin d''ornement avec cascade filtrée et plantations aquatiques.'
  )
ON CONFLICT (id) DO UPDATE SET
  nom_client = EXCLUDED.nom_client,
  adresse = EXCLUDED.adresse,
  statut = EXCLUDED.statut,
  date_debut = EXCLUDED.date_debut,
  date_fin = EXCLUDED.date_fin,
  description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- 5. PLANNING SUR 1 BONNE SEMAINE (J-1 à J+5)
-- ------------------------------------------------------------------------------
INSERT INTO public.affectations (chantier_id, profile_id, date_intervention)
VALUES
  -- Hier (CURRENT_DATE - 1)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE - INTERVAL '1 day'), -- Jean @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE - INTERVAL '1 day'), -- Thomas @ Laurent
  ('c2000000-0000-4000-8000-000000000002', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE - INTERVAL '1 day'), -- Lucas @ Cèdres
  ('c2000000-0000-4000-8000-000000000002', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE - INTERVAL '1 day'), -- Antoine @ Cèdres
  ('c2000000-0000-4000-8000-000000000002', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE - INTERVAL '1 day'), -- Marc (Chef) @ Cèdres

  -- Aujourd'hui (CURRENT_DATE)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE), -- Jean @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE), -- Thomas @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE), -- Marc (Chef) @ Laurent
  ('c2000000-0000-4000-8000-000000000002', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE), -- Lucas @ Cèdres
  ('c2000000-0000-4000-8000-000000000002', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE), -- Antoine @ Cèdres

  -- Demain (CURRENT_DATE + 1 day)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE + INTERVAL '1 day'), -- Jean @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE + INTERVAL '1 day'), -- Thomas @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE + INTERVAL '1 day'), -- Marc (Chef) @ Laurent
  ('c4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE + INTERVAL '1 day'), -- Lucas @ Techlid
  ('c4000000-0000-4000-8000-000000000004', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE + INTERVAL '1 day'), -- Antoine @ Techlid

  -- J+2 (CURRENT_DATE + 2 days)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE + INTERVAL '2 days'), -- Jean @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE + INTERVAL '2 days'), -- Thomas @ Laurent
  ('c2000000-0000-4000-8000-000000000002', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE + INTERVAL '2 days'), -- Marc @ Cèdres
  ('c4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE + INTERVAL '2 days'), -- Lucas @ Techlid
  ('c4000000-0000-4000-8000-000000000004', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE + INTERVAL '2 days'), -- Antoine @ Techlid

  -- J+3 (CURRENT_DATE + 3 days)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE + INTERVAL '3 days'), -- Jean @ Laurent
  ('c4000000-0000-4000-8000-000000000004', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE + INTERVAL '3 days'), -- Thomas @ Techlid
  ('c4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE + INTERVAL '3 days'), -- Lucas @ Techlid
  ('c4000000-0000-4000-8000-000000000004', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE + INTERVAL '3 days'), -- Marc (Chef) @ Techlid
  ('c2000000-0000-4000-8000-000000000002', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE + INTERVAL '3 days'), -- Antoine @ Cèdres

  -- J+4 (CURRENT_DATE + 4 days)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE + INTERVAL '4 days'), -- Jean @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE + INTERVAL '4 days'), -- Marc (Chef) @ Laurent
  ('c4000000-0000-4000-8000-000000000004', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE + INTERVAL '4 days'), -- Thomas @ Techlid
  ('c4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE + INTERVAL '4 days'), -- Lucas @ Techlid
  ('c3000000-0000-4000-8000-000000000003', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE + INTERVAL '4 days'), -- Antoine @ Beauvallon

  -- J+5 (CURRENT_DATE + 5 days)
  ('c3000000-0000-4000-8000-000000000003', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE + INTERVAL '5 days'), -- Jean @ Beauvallon
  ('c3000000-0000-4000-8000-000000000003', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE + INTERVAL '5 days'), -- Antoine @ Beauvallon
  ('c3000000-0000-4000-8000-000000000003', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE + INTERVAL '5 days'), -- Marc (Chef) @ Beauvallon
  ('c4000000-0000-4000-8000-000000000004', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE + INTERVAL '5 days'), -- Thomas @ Techlid
  ('c4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE + INTERVAL '5 days')  -- Lucas @ Techlid
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. POLITIQUES DE SÉCURITÉ (RLS) COMPLÈTES & ROBUSTES
-- ------------------------------------------------------------------------------

-- Profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Authenticated users can view profiles') THEN
    CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

-- Chantiers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chantiers' AND policyname = 'Authenticated users can view chantiers') THEN
    CREATE POLICY "Authenticated users can view chantiers" ON public.chantiers FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chantiers' AND policyname = 'Authenticated users can insert chantiers') THEN
    CREATE POLICY "Authenticated users can insert chantiers" ON public.chantiers FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chantiers' AND policyname = 'Authenticated users can update chantiers') THEN
    CREATE POLICY "Authenticated users can update chantiers" ON public.chantiers FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- Affectations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'affectations' AND policyname = 'Authenticated users can view affectations') THEN
    CREATE POLICY "Authenticated users can view affectations" ON public.affectations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'affectations' AND policyname = 'Authenticated users can manage affectations') THEN
    CREATE POLICY "Authenticated users can manage affectations" ON public.affectations FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Pointages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pointages' AND policyname = 'Users can insert own pointages') THEN
    CREATE POLICY "Users can insert own pointages" ON public.pointages FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pointages' AND policyname = 'Authenticated users can view pointages') THEN
    CREATE POLICY "Authenticated users can view pointages" ON public.pointages FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
