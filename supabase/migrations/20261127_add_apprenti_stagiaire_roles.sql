-- ==============================================================================
-- PAYSAGE CONCEPT - AJOUT DES RÔLES APPRENTI & STAGIAIRE
-- À exécuter dans le "SQL Editor" de votre tableau de bord Supabase :
-- https://supabase.com/dashboard/project/cxcvngmniodppirpzzdz/sql
--
-- IMPORTANT (erreur PostgreSQL 55P04) :
-- Le SQL Editor exécute tout le script dans une seule transaction.
-- Exécutez D'ABORD ce fichier tel quel (uniquement les ALTER TYPE) pour valider
-- le commit des nouvelles valeurs d'enum, puis exécutez l'étape 2 ci-dessous
-- dans une NOUVELLE requête séparée.
-- ==============================================================================

-- ÉTAPE 1 (à exécuter seule en premier) :
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'apprenti';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'stagiaire';

-- ==============================================================================
-- ÉTAPE 2 (à copier-coller dans une NOUVELLE requête après succès de l'étape 1) :
-- ==============================================================================
-- SELECT unnest(enum_range(NULL::public.user_role)) AS user_role_values;
--
-- -- (Optionnel) Mise à jour des profils de test s'ils existent dans public.profiles :
-- UPDATE public.profiles SET role = 'apprenti' WHERE email = 'lucas.moreau@paysageconcept.fr';
-- UPDATE public.profiles SET role = 'stagiaire' WHERE email = 'antoine.petit@paysageconcept.fr';
