# Inventaire des Fonctionnalités (V1) — Paysage Concept

Ce document recense l'ensemble des fonctionnalités actives de la V1 devant impérativement être préservées à l'identique lors de tout refactoring.

---

## 1. Matrice des droits par rôle

| Fonctionnalité / Route | `ouvrier` | `chef_equipe` | `admin` |
|---|---|---|---|
| Connexion Supabase & comptes démo (`/login`) | Oui | Oui | Oui |
| Accueil & déclaration d'heures (`/`) | Oui (ses chantiers affectés) | Oui (tous les chantiers) | Oui (tous les chantiers) |
| Synthèse équipe du jour sur Accueil | Non | Oui | Oui |
| Planning (`/planning`) | Ses affectations uniquement | Personnel / Global / Par équipier | Personnel / Global / Par équipier |
| Catalogue chantiers (`/chantiers`) | Bloqué (redirection `/`) | Oui (CRUD + affectations) | Oui (CRUD + affectations) |
| Fiche chantier (`/chantier/:id`) | Lecture seule si affecté au moins 1 fois, sinon bloqué | Lecture + changement statut + affectation | Lecture + changement statut + affectation |
| Annuaire Équipe (`/equipe`) | Oui | Oui | Oui |
| Messagerie mockée (`/chat`) | Oui | Oui | Oui |
| Options / Diagnostic (`/plus`) | Oui (sans bloc gestion chantiers) | Oui + raccourci `/chantiers` | Oui + raccourci `/chantiers` |

---

## 2. Inventaire exhaustif des fonctionnalités V1

### F1 — Authentification hybride (Supabase + Démo locale) ([Login.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Login.tsx), [AuthContext.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/context/AuthContext.tsx))
- **Connexion / Inscription Supabase** : email + mot de passe ; en mode inscription, saisie de `prenom`, `nom` et `role` (`ouvrier`, `chef_equipe`, `admin`). Gestion du cas `Email not confirmed`.
- **Restauration instantanée offline-first** : au lancement, restaure `paysage_active_profile_id` depuis Dexie avant même d'attendre Supabase.
- **Accès Démo 1-clic** pour 5 profils pré-seedés (Jean Dupont ouvrier, Marc Vasseur chef d'équipe, Thomas Bernard, Lucas Moreau, Antoine Petit) : tente d'abord un `signInWithPassword` réel avec `Paysage2026!` si en ligne, sinon bascule sur `loginDemo()` en mode local (`isDemo = true`).
- **Déconnexion** : `supabase.auth.signOut()` si en ligne + nettoyage `localStorage` (`paysage_active_profile_id`, `paysage_is_demo`).

### F2 — Shell PWA & Navigation persistante ([AppLayout.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/layout/AppLayout.tsx), [BottomNav.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/layout/BottomNav.tsx))
- Conteneur mobile centré (`max-w-md`), couverture de la barre d'état iOS/Android (`env(safe-area-inset-top)` en `#15302F`), défilement clavier global et renvoi du scroll wheel/touch des marges desktop vers `<main>`.
- Header persistant Vert Forêt sur toutes les pages protégées **sauf** `/` (où `Home.tsx` affiche son propre hero header).
- Barre inférieure fixe à 5 onglets (`Accueil`, `Planning`, `Équipe`, `Chat` avec badge Terracotta `'2'`, `Plus`), indicateur actif Vert Forêt + point Sauge, cibles >= `48x48px`.
- `NetworkBanner` ([NetworkBanner.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/common/NetworkBanner.tsx)) : pastille `En ligne` / `Hors-ligne` + bouton `N en attente` déclenchant `syncEngine.triggerSync()`.

### F3 — Tableau de bord Accueil ([Home.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Home.tsx))
- **Header biophilique** : logo, rôle, `NetworkBanner`, initiales utilisateur, salutation `Bonjour [Prénom] 👋`, widget météo temps réel Open-Meteo ([weather.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/weather.ts)) basé sur la géolocalisation du chantier sélectionné (ou Lyon par défaut) avec fallback hors-ligne.
- **Calendrier hebdomadaire (`WeeklyCalendarStrip`)** : sélection d'une date (Lun–Dim), navigation semaine précédente/suivante, bouton `Aujourd'hui`, pastille indicateur du jour courant.
- **Carte Hero Chantier (« Prochaine intervention »)** : badge statut, nom client, adresse cliquable vers Google Maps (`maps.google.com/?q=...`), sélecteur de bascule si plusieurs chantiers disponibles, lien vers `/chantier/:id`. Fallback informatif si aucun chantier assigné ce jour.
- **Raccourci Superviseur** (rôles `chef_equipe` / `admin`) : carte lien vers `/chantiers`.

### F4 — Suivi déclaratif des heures & Jauge circulaire ([Home.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Home.tsx), [CircularProgressGauge.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/common/CircularProgressGauge.tsx), [hours.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/hours.ts))
- **Jauge fer à cheval 260°** : affiche les heures totales déclarées pour `selectedDateStr`, le pourcentage par rapport à l'objectif journalier (défaut `7h00`), le badge `Objectif atteint 🎯` ou `Non renseigné (0% atteint)`, et un bouton d'édition inline de l'objectif.
- **Configuration de l'objectif journalier** (`isEditingTarget`) : présélections `6h00`, `7h00`, `9h00` et steppers `± 30 min`, borné `[1h, 24h]`, persisté par profil dans `localStorage`.
- **Modale / Bottom Sheet de déclaration par plages horaires** :
  - Raccourci `Horaires habituels` (`Appliquer`) mémorisé dans `localStorage` après validation.
  - Saisie **Heure d'arrivée** (`input[type="time"]`, steppers `± 15 min`, boutons rapides `07h00`, `07h30`, `08h00`, `08h30`).
  - Saisie **Heure de départ** (`input[type="time"]`, steppers `± 15 min`, boutons rapides `16h30`, `17h00`, `17h30`, `18h00`).
  - Saisie **Temps de pause** (défaut `30 min` / `0.5h`, steppers `± 15 min`, presets `Sans pause`, `15 min`, `30 min`, `45 min`, `1h00`).
  - **Carte résultat en direct** : durée nette calculée (pause déduite), heures normales et heures supplémentaires (déjà incluses dans le total).
  - **Accordéon « Ajuster les heures sup & détails »** : affiche amplitude brute et pause déduite, permet le débrayage manuel des heures sup (`± 15 min`, presets `0h`, `+0h30`, `+1h00`, `+1h30`, `+2h00`) ou le réalignement sur le calcul automatique (`Réaligner`).
  - **Enregistrement idempotent** : sauvegarde dans Dexie via `syncEngine.saveDailyPointage()` (clé unique `[profile_id+date]`), toast de succès et déclenchement de synchronisation si en ligne.
- **Récapitulatif « Ma déclaration du jour »** : total, statut synchro, heures normales, heures sup, pause, détail arithmétique et heure de mise à jour.

### F5 — Supervision & Analyse des heures ([Home.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Home.tsx), [HoursAnalyticsSection.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/common/HoursAnalyticsSection.tsx))
- **Suivi de l'équipe** (superviseurs sur `Home`) : nombre d'équipiers déclarés (`X / Y déclarés`), total équipe (normales + sup) et liste nominative par date sélectionnée.
- **Section Analyse & Historique (`HoursAnalyticsSection`)** :
  - Bascule `Semaine | Mois` et navigation temporelle (`<`, `>`, `Aujourd'hui`).
  - 3 cartes KPI : Total travaillé (et jours déclarés), Heures sup, Objectif de période (jours ouvrés × objectif journalier).
  - Graphique SVG interactif à barres empilées (Vert Forêt = normales, Terracotta = heures sup) avec ligne pointillée de l'objectif journalier. Clic sur une barre pour inspecter le jour et bouton `Modifier` / `Saisir` ouvrant directement la modale sur cette date.
  - Registre déroulant des déclarations de la période (`Afficher tout` / `Réduire` au-delà de 3 éléments) avec statut `Synchronisé` / `En attente`.

### F6 — Planning multi-horizons ([Planning.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Planning.tsx))
- **Toggle 3 états** : `Jour | Semaine | Mois`.
- **Filtre superviseur** (`chef_equipe` / `admin`) : `Mon planning personnel`, `Toute l'équipe`, ou planning individuel d'un ouvrier.
- **Vue Jour** : navigation semaine `< / >`, bouton `Aujourd'hui`, bandeau Lun–Dim, cartes chantiers avec adresse GPS, badge `Votre mission`, liste des équipiers sur place (cliquables pour ouvrir la **modale Quick Contact** avec `sms:` / `tel:`) et lien vers `/chantier/:id`.
- **Vue Semaine** : liste des 7 jours et missions associées ; clic sur un jour bascule sur la vue `Jour` à cette date.
- **Vue Mois** : grille calendaire complète (7 colonnes Lun–Dim incluant jours adjacents) avec pastilles d'activité (émeraude si l'utilisateur est affecté, terracotta sinon) + résumé du jour sélectionné et bouton `Voir le déroulé`.

### F7 — Fiche Chantier & Gestion Catalogue ([ChantierDetail.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/ChantierDetail.tsx), [Chantiers.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Chantiers.tsx))
- **Fiche Chantier typographique (`ChantierDetail`)** : sans balise `<img>`/`<video>` ni upload de fichier ; statut, plage de dates, bouton GPS Waze/Maps, équipe affectée à la date cible (avatars + boutons `sms:`/`tel:` pour les collègues), 2 cartes documents statiques (`Plan d'aménagement.pdf`, `Devis signé.pdf`), descriptif travaux, contact client cliquable (`tel:`).
- **Pilotage Superviseur sur `ChantierDetail`** : changement de statut (`en_attente`, `en_cours`, `termine`) et affectation/retrait d'équipiers par date.
- **Catalogue Chantiers (`Chantiers`)** : recherche instantanée (client, adresse, description), filtres statut (`Tous`, `En cours`, `En attente`, `Terminés`), modales de création, d'édition et d'affectation d'équipiers par date.

### F8 — Annuaire Équipe, Messagerie Mock & Options ([Equipe.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Equipe.tsx), [ChatPreview.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/ChatPreview.tsx), [Plus.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Plus.tsx))
- **Équipe** : recherche par nom/prénom, filtres par rôle (`Tous`, `Chefs d'équipe`, `Ouvriers`, `Direction`), affichage du chantier d'affectation du jour et boutons d'action `tel:` / `sms:`.
- **Chat Preview** : 5 canaux statiques mockés (`INITIAL_CHANNELS`), recherche, onglets `Tous | Équipe | Chantier | Direction`, support query param `?channel=` ou `?chantier=`, remise à zéro locale du compteur non-lu à l'ouverture, salle de discussion `ChatRoomView` avec envoi de messages ajoutés en mémoire React uniquement.
- **Plus** : carte profil + badge `Démo Locale` / `Compte Supabase`, sélecteur de thème d'affichage à 3 états (`Système` / `Clair` / `Sombre`) dans le bloc **Apparence & Thème**, accès superviseur à `/chantiers`, compteurs Dexie (`pointages`, `en attente`, `chantiers`, `profiles`), bouton `Forcer la synchronisation Supabase`, bouton `Réinitialiser les données locales démo` (`reseedDatabase()`), guide d'installation PWA iOS/Android, version MVP (`1.0.0`) et déconnexion.

### F9 — Thème d'affichage Clair / Sombre / Système ([ThemeContext.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/context/ThemeContext.tsx), [ThemeSelector.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/common/ThemeSelector.tsx), [theme.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/theme.ts))
- **Trois modes supportés** : `Système` (défaut, suit en temps réel `prefers-color-scheme: dark`), `Clair` (thème biophilique plein soleil original préservé à 100 %) et `Sombre` (palette « Ardoise Forestière » optimisée faible luminosité sans noir pur `#000000`).
- **Persistance & Zéro FOUC** : enregistré dans `localStorage` (`paysage_theme_preference`), appliqué de façon synchrone dès le `<head>` de `index.html` avec synchronisation de `.dark`, `color-scheme` CSS (y compris pour les sélecteurs natifs `date`/`time`) et `<meta name="theme-color">` (`#15302F` en clair / `#0F1D1C` en sombre).
- **Contrôles UI** : sélecteur segmenté accessible (`role="radiogroup"`) dans `/plus` et bouton cyclique discret sur `/login`.

---

## 3. Règles métier & Calculs ([src/lib/hours.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/hours.ts))

| Règle / Fonction | Formule & Invariants | Contraintes & Cas limites |
|---|---|---|
| `normalizeTimeString(time)` | Normalise `"H:m"` ou `"HH:mm:ss"` vers `"HH:mm"` | Retourne `""` si heures hors `[0, 23]` ou minutes hors `[0, 59]` |
| `calculateAmplitude(debut, fin)` | `round((endDec - startDec) * 100) / 100` | Retourne `0` si un horaire manque ou si `fin <= debut` (pas de travail à cheval sur minuit) |
| `calculateDurationFromRange(debut, fin, pause)` | `max(0, round((amplitude - max(0, pause)) * 100) / 100)` | Pause non-finie traitée comme `0` |
| `validateTimeRange(debut, fin, pause)` | Vérifie présence `debut` & `fin`, `fin > debut`, `pause >= 0`, `pause < amplitude`, `dureeNette <= 24` | Rejette les pauses supérieures ou égales à l'amplitude |
| `calculateAutoOvertime(total, target)` | `max(0, round((max(0, total) - max(0, target)) * 100) / 100)` | Retourne `0` si `total` ou `target` est non-fini |
| `calculateNormalHours(total, sup)` | `max(0, round((safeTotal - min(safeTotal, safeSup)) * 100) / 100)` | Garantit `normalHours + heuresSup === total` pour tout `0 <= sup <= total` |
| `validateDailyHours(total, pause, sup)` | Tous finis, `>= 0`, `<= 24`, et `sup <= total` | `0h` autorisé par `validateDailyHours`, mais le bouton submit dans `Home.tsx` impose `heuresTotales > 0` |
| `adjustTimeString(str, deltaMin)` | Décale par pas de minutes (défaut UI `± 15`), clampé `[00:00, 23:59]` | Fallback sur `'08:00'` si chaîne vide |
| `aggregateTeamDailyStatus(pts, profiles, date)` | Agrège par profil pour `targetDate` ; `hasSubmitted = pt && heures_totales > 0` | N'exclut pas de lui-même le superviseur : `Home.tsx` filtre `p.id !== profile.id` avant appel |
