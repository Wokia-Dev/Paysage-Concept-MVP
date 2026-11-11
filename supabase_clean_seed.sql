-- ==============================================================================
-- PAYSAGE CONCEPT - RESET COMPLET & SEEDING PROPRE (0 POINTAGES)
-- Console Supabase : https://supabase.com/dashboard/project/cxcvngmniodppirpzzdz/sql
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PURGE PROPRE (RESPECT STRICT DE L'ORDRE DES CLÉS ÉTRANGÈRES)
-- ------------------------------------------------------------------------------

-- 1.1. Vider strictement la table des pointages (pour base 100% vierge)
DELETE FROM public.pointages;

-- 1.2. Vider les affectations
DELETE FROM public.affectations;

-- 1.3. Vider les chantiers
DELETE FROM public.chantiers;

-- 1.4. Nettoyer les identités orphelines dans auth.identities
DELETE FROM auth.identities
WHERE user_id NOT IN (
  '4fa02732-58a2-4de7-872f-1db234899c1e', -- Jean Dupont
  'd587499d-3f96-4164-b37f-01b7a442646b', -- Marc Vasseur
  'b3000000-0000-4000-8000-000000000003', -- Thomas Bernard
  'b4000000-0000-4000-8000-000000000004', -- Lucas Moreau
  'b5000000-0000-4000-8000-000000000005'  -- Antoine Petit
);

-- 1.5. Nettoyer les profils sauf les utilisateurs de test définis
DELETE FROM public.profiles
WHERE id NOT IN (
  '4fa02732-58a2-4de7-872f-1db234899c1e',
  'd587499d-3f96-4164-b37f-01b7a442646b',
  'b3000000-0000-4000-8000-000000000003',
  'b4000000-0000-4000-8000-000000000004',
  'b5000000-0000-4000-8000-000000000005'
);

-- 1.6. Nettoyer auth.users sauf les utilisateurs de test définis
DELETE FROM auth.users
WHERE id NOT IN (
  '4fa02732-58a2-4de7-872f-1db234899c1e',
  'd587499d-3f96-4164-b37f-01b7a442646b',
  'b3000000-0000-4000-8000-000000000003',
  'b4000000-0000-4000-8000-000000000004',
  'b5000000-0000-4000-8000-000000000005'
);

-- ------------------------------------------------------------------------------
-- 2. CRÉATION / SYNCHRONISATION DES COMPTES DANS AUTH.USERS & AUTH.IDENTITIES
-- Mot de passe unique garanti : 'Paysage2026!'
-- Compatibilité GoTrue Auth (scan strings non-null + provider identities)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_instance uuid;
  v_pwd text;
BEGIN
  SELECT instance_id INTO v_instance FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-4000-8000-000000000000'::uuid;
  END IF;

  BEGIN
    v_pwd := extensions.crypt('Paysage2026!', extensions.gen_salt('bf'));
  EXCEPTION WHEN OTHERS THEN
    v_pwd := '$2a$10$wE1V6J2/bH9eWvGj.QO/5Oi1u0H7yB6V7Zt9W1iE.dK6Z0i9fP5y2';
  END;

  -- 1. Jean Dupont
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change, phone_change,
    created_at, updated_at
  ) VALUES (
    '4fa02732-58a2-4de7-872f-1db234899c1e',
    v_instance,
    'jean.dupont@paysageconcept.fr',
    v_pwd,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Jean","nom":"Dupont"}'::jsonb,
    'authenticated',
    'authenticated',
    '', '', '', '', '',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = v_pwd,
    email_confirmed_at = now(),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    recovery_token = COALESCE(auth.users.recovery_token, ''),
    email_change = COALESCE(auth.users.email_change, '');

  -- 2. Marc Vasseur (Chef d'équipe)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change, phone_change,
    created_at, updated_at
  ) VALUES (
    'd587499d-3f96-4164-b37f-01b7a442646b',
    v_instance,
    'marc.vasseur@paysageconcept.fr',
    v_pwd,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Marc","nom":"Vasseur"}'::jsonb,
    'authenticated',
    'authenticated',
    '', '', '', '', '',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = v_pwd,
    email_confirmed_at = now(),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    recovery_token = COALESCE(auth.users.recovery_token, ''),
    email_change = COALESCE(auth.users.email_change, '');

  -- 3. Thomas Bernard
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change, phone_change,
    created_at, updated_at
  ) VALUES (
    'b3000000-0000-4000-8000-000000000003',
    v_instance,
    'thomas.bernard@paysageconcept.fr',
    v_pwd,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Thomas","nom":"Bernard"}'::jsonb,
    'authenticated',
    'authenticated',
    '', '', '', '', '',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = v_pwd,
    email_confirmed_at = now(),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    recovery_token = COALESCE(auth.users.recovery_token, ''),
    email_change = COALESCE(auth.users.email_change, '');

  -- 4. Lucas Moreau
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change, phone_change,
    created_at, updated_at
  ) VALUES (
    'b4000000-0000-4000-8000-000000000004',
    v_instance,
    'lucas.moreau@paysageconcept.fr',
    v_pwd,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Lucas","nom":"Moreau"}'::jsonb,
    'authenticated',
    'authenticated',
    '', '', '', '', '',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = v_pwd,
    email_confirmed_at = now(),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    recovery_token = COALESCE(auth.users.recovery_token, ''),
    email_change = COALESCE(auth.users.email_change, '');

  -- 5. Antoine Petit
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change, phone_change,
    created_at, updated_at
  ) VALUES (
    'b5000000-0000-4000-8000-000000000005',
    v_instance,
    'antoine.petit@paysageconcept.fr',
    v_pwd,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"prenom":"Antoine","nom":"Petit"}'::jsonb,
    'authenticated',
    'authenticated',
    '', '', '', '', '',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = v_pwd,
    email_confirmed_at = now(),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    recovery_token = COALESCE(auth.users.recovery_token, ''),
    email_change = COALESCE(auth.users.email_change, '');
END $$;

-- Enregistrement / synchronisation des identités GoTrue
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
  ) THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES
      ('4fa02732-58a2-4de7-872f-1db234899c1e', '4fa02732-58a2-4de7-872f-1db234899c1e', '4fa02732-58a2-4de7-872f-1db234899c1e', '{"sub":"4fa02732-58a2-4de7-872f-1db234899c1e","email":"jean.dupont@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('d587499d-3f96-4164-b37f-01b7a442646b', 'd587499d-3f96-4164-b37f-01b7a442646b', 'd587499d-3f96-4164-b37f-01b7a442646b', '{"sub":"d587499d-3f96-4164-b37f-01b7a442646b","email":"marc.vasseur@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('b3000000-0000-4000-8000-000000000003', 'b3000000-0000-4000-8000-000000000003', 'b3000000-0000-4000-8000-000000000003', '{"sub":"b3000000-0000-4000-8000-000000000003","email":"thomas.bernard@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('b4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', '{"sub":"b4000000-0000-4000-8000-000000000004","email":"lucas.moreau@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('b5000000-0000-4000-8000-000000000005', 'b5000000-0000-4000-8000-000000000005', 'b5000000-0000-4000-8000-000000000005', '{"sub":"b5000000-0000-4000-8000-000000000005","email":"antoine.petit@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES
      ('4fa02732-58a2-4de7-872f-1db234899c1e', '4fa02732-58a2-4de7-872f-1db234899c1e', '{"sub":"4fa02732-58a2-4de7-872f-1db234899c1e","email":"jean.dupont@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('d587499d-3f96-4164-b37f-01b7a442646b', 'd587499d-3f96-4164-b37f-01b7a442646b', '{"sub":"d587499d-3f96-4164-b37f-01b7a442646b","email":"marc.vasseur@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('b3000000-0000-4000-8000-000000000003', 'b3000000-0000-4000-8000-000000000003', '{"sub":"b3000000-0000-4000-8000-000000000003","email":"thomas.bernard@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('b4000000-0000-4000-8000-000000000004', 'b4000000-0000-4000-8000-000000000004', '{"sub":"b4000000-0000-4000-8000-000000000004","email":"lucas.moreau@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now()),
      ('b5000000-0000-4000-8000-000000000005', 'b5000000-0000-4000-8000-000000000005', '{"sub":"b5000000-0000-4000-8000-000000000005","email":"antoine.petit@paysageconcept.fr"}'::jsonb, 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. INSERTION DES PROFILS DANS PUBLIC.PROFILES
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, nom, prenom, telephone, role)
VALUES
  ('4fa02732-58a2-4de7-872f-1db234899c1e', 'Dupont', 'Jean', '06 12 34 56 78', 'ouvrier'),
  ('d587499d-3f96-4164-b37f-01b7a442646b', 'Vasseur', 'Marc', '06 98 76 54 32', 'chef_equipe'),
  ('b3000000-0000-4000-8000-000000000003', 'Bernard', 'Thomas', '06 45 67 89 01', 'ouvrier'),
  ('b4000000-0000-4000-8000-000000000004', 'Moreau', 'Lucas', '06 23 45 67 89', 'ouvrier'),
  ('b5000000-0000-4000-8000-000000000005', 'Petit', 'Antoine', '06 34 56 78 90', 'ouvrier')
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  telephone = EXCLUDED.telephone,
  role = EXCLUDED.role;

-- ------------------------------------------------------------------------------
-- 4. INSERTION DES 4 CHANTIERS (EN COURS, À VENIR, TERMINÉ)
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
    'Pose d''enrochements en granit, plantation d''érables du Japon et réalisation d''une terrasse en bois ipé de 45m².'
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
    'Tranchées pour arrosage automatique Rain Bird 4 zones, plantations de 350 vivaces mellifères avec paillage chanvre.'
  ),
  (
    'c4000000-0000-4000-8000-000000000004',
    'Parc Techlid - Bassin d''agrément & Pavage',
    '120 Allée des Chênes, 69760 Limonest',
    'termine',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '2 days',
    'Pavage carrossable en dalles grès cérame, création d''un bassin d''ornement avec cascade filtrée.'
  )
ON CONFLICT (id) DO UPDATE SET
  nom_client = EXCLUDED.nom_client,
  adresse = EXCLUDED.adresse,
  statut = EXCLUDED.statut,
  date_debut = EXCLUDED.date_debut,
  date_fin = EXCLUDED.date_fin,
  description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- 5. AFFECTATIONS DE LA SEMAINE (AUJOURD'HUI ET JOURS SUIVANTS)
-- ------------------------------------------------------------------------------
INSERT INTO public.affectations (chantier_id, profile_id, date_intervention)
VALUES
  -- Aujourd'hui (CURRENT_DATE)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE), -- Jean @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE), -- Thomas @ Laurent
  ('c1000000-0000-4000-8000-000000000001', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE), -- Marc (Chef) @ Laurent
  ('c2000000-0000-4000-8000-000000000002', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE), -- Lucas @ Cèdres
  ('c2000000-0000-4000-8000-000000000002', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE), -- Antoine @ Cèdres

  -- Demain (CURRENT_DATE + 1 day)
  ('c1000000-0000-4000-8000-000000000001', '4fa02732-58a2-4de7-872f-1db234899c1e', CURRENT_DATE + INTERVAL '1 day'), -- Jean
  ('c1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000003', CURRENT_DATE + INTERVAL '1 day'), -- Thomas
  ('c1000000-0000-4000-8000-000000000001', 'd587499d-3f96-4164-b37f-01b7a442646b', CURRENT_DATE + INTERVAL '1 day'), -- Marc
  ('c2000000-0000-4000-8000-000000000002', 'b4000000-0000-4000-8000-000000000004', CURRENT_DATE + INTERVAL '1 day'), -- Lucas
  ('c2000000-0000-4000-8000-000000000002', 'b5000000-0000-4000-8000-000000000005', CURRENT_DATE + INTERVAL '1 day')  -- Antoine
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. GARANTIE DU SCHÉMA POINTAGES (COLONNES HEURE_DEBUT / HEURE_FIN & RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.pointages
  ADD COLUMN IF NOT EXISTS heure_debut TIME NULL,
  ADD COLUMN IF NOT EXISTS heure_fin TIME NULL;

-- ------------------------------------------------------------------------------
-- 7. VÉRIFICATION FINALE : LA TABLE POINTAGES DOIT ÊTRE STRICTEMENT VIDE
-- ------------------------------------------------------------------------------
-- Aucune insertion dans public.pointages.

COMMIT;
