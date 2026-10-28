# Guide de Migration Supabase : Système de Pointage Déclaratif

Ce guide fournit les instructions pas-à-pas pour exécuter la migration du système de pointage dans votre projet Supabase.

---

## 1. Contexte de la Migration

La pointeuse mobile temps-réel avec badgeage multi-étapes (`arrivee`, `pause`, `reprise`, `depart`), minuteurs continus et géolocalisation GPS est remplacée par un **système déclaratif journalier** :
- **Heures totales travaillées** (`heures_totales`, ex. 8.00 ou 7.50).
- **Temps de pause** (`temps_pause`, ex. 1.00).
- **Heures supplémentaires** (`heures_sup`, ex. 0.50, avec contrainte `heures_sup <= heures_totales`).
- **Date d'intervention** (`date`, format `YYYY-MM-DD`).
- **Chantier associé** (`chantier_id`, désormais optionnel/nullable avec règle `ON DELETE SET NULL`).
- **Contrainte d'unicité journalière** : `UNIQUE (profile_id, date)` pour permettre des opérations `UPSERT` sans doublon à tout moment de la journée.

---

## 2. Instructions Pas-à-Pas d'Exécution

### Étape 1 : Accéder au Tableau de Bord Supabase
1. Rendez-vous sur le tableau de bord Supabase du projet :  
   **URL directe :** [https://supabase.com/dashboard/project/cxcvngmniodppirpzzdz/sql](https://supabase.com/dashboard/project/cxcvngmniodppirpzzdz/sql)
2. Connectez-vous avec vos identifiants administrateur.

### Étape 2 : Ouvrir l'Éditeur SQL
1. Dans la barre latérale gauche, cliquez sur l'icône **SQL Editor** (`>_`).
2. Cliquez sur le bouton vert **"+ New Query"**.
3. Renommez la requête : `20261028_refactor_pointages_declaratif`.

### Étape 3 : Coller et Exécuter le Script
1. Ouvrez le fichier de migration :  
   `supabase/migrations/20261028_refactor_pointages_declaratif.sql`
2. Copiez l'intégralité de son contenu.
3. Collez-le dans l'éditeur SQL de Supabase.
4. Cliquez sur **"Run"** (ou `Ctrl + Enter` / `Cmd + Enter`).
5. Le message de confirmation doit indiquer : `Success. No rows returned`.

---

## 3. Requêtes de Contrôle et Vérification

Exécutez les requêtes SQL suivantes dans l'éditeur SQL pour valider la bonne application :

### A. Vérifier la structure des colonnes de `pointages`
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pointages'
ORDER BY ordinal_position;
```
*Attendu :* Colonnes `id`, `profile_id`, `chantier_id`, `date`, `heures_totales`, `temps_pause`, `heures_sup`, `synchronise_le`, `created_at`, `updated_at`.

### B. Vérifier la suppression de l'énumérateur obsolète `pointage_type`
```sql
SELECT typname FROM pg_type WHERE typname = 'pointage_type';
```
*Attendu :* `0 rows` (l'énumérateur est complètement supprimé).

### C. Vérifier les contraintes de table (Unicité & Checks)
```sql
SELECT conname, contype, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'pointages';
```
*Attendu :*
- `pointages_pkey` : `PRIMARY KEY (id)`
- `pointages_profile_date_unique` : `UNIQUE (profile_id, date)`
- `pointages_heures_totales_positive` : `CHECK (heures_totales >= 0 AND heures_totales <= 24)`
- `pointages_temps_pause_positive` : `CHECK (temps_pause >= 0 AND temps_pause <= 24)`
- `pointages_heures_sup_positive` : `CHECK (heures_sup >= 0 AND heures_sup <= 24)`
- `pointages_heures_sup_le_totales` : `CHECK (heures_sup <= heures_totales)`

### D. Vérifier les politiques RLS (Row Level Security)
```sql
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'pointages';
```
*Attendu :*
- `pointages_select_policy` : `SELECT` pour `authenticated`
- `pointages_insert_policy` : `INSERT` pour `authenticated`
- `pointages_update_policy` : `UPDATE` pour `authenticated` (**indispensable pour l'upsert**)
- `pointages_delete_policy` : `DELETE` pour `authenticated`

---

## 4. Points d'Architecture Importants

1. **Politique UPDATE pour `ON CONFLICT DO UPDATE` :**  
   PostgreSQL et PostgREST exigent formellement qu'une politique `UPDATE` soit active sur la table pour que la clause `ON CONFLICT (profile_id, date) DO UPDATE` réussisse. Sans celle-ci, tout upsert sur une ligne existante échouerait avec une erreur de permission RLS.

2. **Règle `ON DELETE SET NULL` sur `chantier_id` :**  
   Si un chantier est supprimé ou clôturé, les heures prestées par les salariés ne doivent jamais disparaître de la comptabilité de paie. Le lien chantier passe simplement à `NULL`.

3. **Règle `ON DELETE CASCADE` sur `profile_id` :**  
   Si un utilisateur ou compte de test est supprimé de `profiles`, ses pointages associés sont nettoyés automatiquement.
