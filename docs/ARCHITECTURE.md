# Architecture Technique — Paysage Concept (V1)

Ce document décrit l'architecture réelle du dépôt telle qu'implémentée en V1, sans extrapolation.

---

## 1. Arborescence détaillée et commentée

```text
Paysage-Concept-MVP/
├── .github/workflows/deploy.yml      # CI/CD GitHub Pages : npm ci, build avec VITE_BASE_PATH, copie dist/index.html -> dist/404.html
├── .env.example                      # Modèle de configuration Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── index.html                        # Point d'entrée HTML, meta PWA iOS/Android, viewport-fit=cover, script synchrone anti-FOUC (thème & theme-color)
├── package.json                      # Dépendances et scripts (dev, build, test, lint, preview)
├── vite.config.ts                    # Config Vite + React + Tailwind v4 + VitePWA (manifest, Workbox generateSW)
├── tsconfig.json                     # Références tsconfig.app.json & tsconfig.node.json
├── tsconfig.app.json                 # Config TS client strict:true (target es2023, bundler, verbatimModuleSyntax, erasableSyntaxOnly)
├── tsconfig.node.json                # Config TS strict:true pour vite.config.ts
├── eslint.config.js                  # ESLint flat config (js, typescript-eslint, react-hooks, react-refresh)
├── supabase/
│   ├── README.md                     # Procédure manuelle d'application SQL et vérification RLS
│   └── migrations/
│       ├── 20261028_refactor_pointages_declaratif.sql  # Recréation table pointages (UNIQUE(profile_id,date), checks, trigger, RLS)
│       └── 20261111_add_time_ranges_to_pointages.sql   # Ajout colonnes heure_debut TIME, heure_fin TIME
├── supabase_clean_seed.sql           # Script SQL reset + seed 5 utilisateurs auth, 4 chantiers, affectations J/J+1
├── public/                           # Assets statiques servis à la racine (et précachés par Workbox)
│   ├── hero-paysage.jpg              # Image d'arrière-plan du header Home.tsx
│   └── logo.png, pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png, favicon.{ico,svg}, masked-icon.svg
├── dev-dist/                         # Artefacts Service Worker générés en dev (devOptions.enabled: true)
└── src/
    ├── main.tsx                      # Montage React 19 StrictMode -> App
    ├── App.tsx                       # ThemeProvider, AuthProvider, BrowserRouter, code-splitting React.lazy + Suspense, gardes de routes
    ├── index.css                     # @import "tailwindcss", @custom-variant dark, @theme tokens, règles html.dark, .pb-safe, .pt-safe, .shadow-soft, .touch-target, .btn-action-primary
    ├── assets/
    │   └── logo.png                  # Logo importé par Login.tsx et Plus.tsx
    ├── types/
    │   ├── database.ts               # Types métier : UserRole, ChantierStatut, Profile, Chantier, Affectation, Pointage, PointageLocal
    │   ├── chat.ts                   # Types Chat mock : ChannelCategory, FilterCategory, ChatMessage, ChatConversation
    │   └── theme.ts                  # Types Thème : ThemePreference ('system' | 'light' | 'dark'), ResolvedTheme ('light' | 'dark')
    ├── data/
    │   └── mockChannels.ts           # Canaux et messages statiques Phase 2
    ├── context/
    │   ├── auth-context-base.ts      # Définition AuthContext & AuthContextType
    │   ├── AuthContext.tsx           # Provider auth offline-first (restauration Dexie + session Supabase + démo)
    │   ├── useAuth.ts                # Hook d'accès sécurisé au contexte AuthContext
    │   ├── theme-context-base.ts     # Définition ThemeContext & ThemeContextType
    │   ├── ThemeContext.tsx          # Provider thème (préférence, écoute OS prefers-color-scheme & storage, synchro DOM/meta)
    │   └── useTheme.ts               # Hook d'accès sécurisé au contexte ThemeContext
    ├── lib/
    │   ├── supabase.ts               # Client Supabase (import.meta.env protégé pour Node + fallback)
    │   ├── db.ts                     # Base IndexedDB Dexie v2 (PaysageConceptDB) + seed initial (profils, chantiers, affectations, exemples)
    │   ├── sync.ts                   # SyncEngine singleton : saveDailyPointage, syncPendingPointages (UPSERT), pullRemoteData, pub/sub
    │   ├── chantiersService.ts       # Mutations chantiers & affectations (validation Supabase JWT + remontée erreurs explicites + Dexie)
    │   ├── hours.ts                  # Règles métier pures : plages horaires, amplitude, durée nette, heures sup auto, validation, agrégats, localStorage
    │   ├── hoursAnalytics.ts         # Calculs purs période Semaine/Mois, KPI et barres SVG
    │   ├── planningUtils.ts          # Calculs purs grilles mois, semaines, filtrage missions et présence équipe
    │   ├── dates.ts                  # Utilitaires dates UTC sans dérive (getTodayDateString, parseMiddayUTC, formatISODate, ISO week, formats FR)
    │   ├── formatters.ts             # Helpers UI purs partagés (generateUUID, getRoleLabel, getInitials, getStatusBadge, getMapsUrl, sanitizePhoneHref)
    │   ├── theme.ts                  # Logique pure thème : lecture/écriture localStorage, résolution OS, application DOM & meta theme-color
    │   └── weather.ts                # Fetch météo Open-Meteo (timeout 3s) + fallback hors-ligne
    ├── hooks/
    │   ├── useHomeDashboard.ts       # État, synchro initiale unique, modale et actions de pointage du tableau de bord
    │   ├── usePlanningData.ts        # État et chargement Dexie / syncEngine du planning multi-vues
    │   ├── useChantiersCatalog.ts    # Catalogue chantiers, filtres et mutations supervisées via chantiersService
    │   ├── useChantierDetail.ts      # Chargement fiche chantier, météo, droits d'accès et actions superviseur
    │   └── usePlusDiagnostics.ts     # Compteurs Dexie, synchro forcée, reset démo et diagnostic PWA
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx         # Shell mobile max-w-md, header Vert Forêt (hors Home), gestion clavier/wheel/touch scroll, Outlet, BottomNav
    │   │   └── BottomNav.tsx         # Barre persistante 5 onglets (Accueil, Planning, Équipe, Chat, Plus)
    │   ├── common/
    │   │   ├── CircularProgressGauge.tsx  # Jauge SVG fer à cheval 260° (heures vs objectif + bouton édition)
    │   │   ├── DateSelectorPill.tsx       # Sélecteur de date réutilisable
    │   │   ├── HoursAnalyticsSection.tsx  # Onglet analytique (orchestration KPI + sous-composants SVG/historique)
    │   │   ├── LogoOutline.tsx            # Logo vectoriel inline (variantes mark et full)
    │   │   ├── NetworkBanner.tsx          # Pastille En ligne / Hors-ligne + compteur pointages non synchronisés + synchro manuelle
    │   │   ├── ThemeSelector.tsx          # Sélecteur de thème 3 états (Système / Clair / Sombre) + variante compacte
    │   │   └── WeeklyCalendarStrip.tsx    # Bandeau 7 jours dans le header Home (navigation semaine + Aujourd'hui)
    │   ├── analytics/
    │   │   ├── HoursBarChartSVG.tsx       # Graphique SVG barres empilées Semaine/Mois
    │   │   └── PointagesHistoryList.tsx   # Liste historique déroulante avec indicateur de synchro
    │   ├── auth/
    │   │   └── DemoAccountsPanel.tsx      # Sélecteur des 5 comptes de démonstration locale
    │   ├── chantiers/
    │   │   ├── ChantierCard.tsx           # Carte catalogue chantier + accès rapide statut/assignation
    │   │   ├── ChantierFormModal.tsx      # Modale création / édition chantier
    │   │   ├── ChantierAssignModal.tsx    # Modale assignation ouvriers sur le catalogue
    │   │   ├── ChantierTeamSection.tsx    # Liste équipe affectée sur la fiche chantier
    │   │   ├── ChantierDocumentsSection.tsx # Section documents PDF mockés (typographique)
    │   │   └── ChantierSupervisorPanel.tsx  # Pilotage statut & affectations sur ChantierDetail
    │   ├── home/
    │   │   ├── HomeHeader.tsx             # En-tête biophilique avec météo, rôle et bandeau hebdomadaire
    │   │   ├── HeroChantierCard.tsx       # Carte chantier du jour + bouton déclaration/modification
    │   │   ├── DailyTargetEditor.tsx      # Éditeur inline objectif journalier [1, 24]
    │   │   ├── TimeRangeField.tsx         # Champ saisie horaire début/fin avec pas de 15 min
    │   │   ├── TimeOvertimeAccordion.tsx  # Accordéon heures sup manuelles + aperçu normal/sup/total
    │   │   ├── TimeDeclarationModal.tsx   # Modale complète de saisie par plages horaires
    │   │   ├── TeamDailySummaryCard.tsx   # Carte synthèse présence/heures équipe (superviseurs)
    │   │   └── DailyDeclarationSummary.tsx # Récapitulatif de la déclaration du jour sélectionné
    │   ├── planning/
    │   │   ├── PlanningDayView.tsx        # Vue Jour du planning + fiches missions
    │   │   ├── PlanningWeekView.tsx       # Vue Semaine du planning
    │   │   ├── PlanningMonthView.tsx      # Vue Mois (grille 7 colonnes) du planning
    │   │   └── MemberContactModal.tsx     # Modale contact rapide d'un équipier
    │   └── modules/
    │       └── ChatRoomView.tsx      # Vue fil de conversation mockée (bulles Vert Forêt / Sable + saisie locale)
    ├── pages/
    │   ├── Login.tsx                 # Connexion / Inscription Supabase + accès rapide 5 profils démo
    │   ├── Home.tsx                  # Tableau de bord (eager route) orchestrant useHomeDashboard + src/components/home/
    │   ├── Planning.tsx              # Planning 3 vues (lazy route) orchestrant usePlanningData + src/components/planning/
    │   ├── ChantierDetail.tsx        # Fiche chantier (lazy route) orchestrant useChantierDetail + src/components/chantiers/
    │   ├── Chantiers.tsx             # Catalogue chantiers (lazy route) orchestrant useChantiersCatalog + src/components/chantiers/
    │   ├── Equipe.tsx                # Annuaire équipe, recherche, filtres par rôle, affectation du jour, liens tel:/sms:
    │   ├── ChatPreview.tsx           # Liste canaux mockés, filtres par catégorie, recherche, ouverture ChatRoomView
    │   └── Plus.tsx                  # Profil utilisateur, stats Dexie, synchro forcée, reset démo, guide PWA, déconnexion
    └── __tests__/                    # 24 fichiers de tests + helpers/sourceReader.ts (503 tests node:test)
```

---

## 2. Flux de données global & Gestion d'état

### Sources de vérité
L'architecture suit un modèle **Local-First / Offline-First** à deux niveaux :

1. **Source de vérité UI (Lecture/Écriture immédiate)** : **IndexedDB via Dexie** (`PaysageConceptDB` dans [src/lib/db.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/db.ts)). Les pages s'appuient sur leurs hooks dédiés (`useHomeDashboard`, `usePlanningData`, `useChantiersCatalog`, `useChantierDetail`, `usePlusDiagnostics`) et les services (`syncEngine`, `chantiersService`) pour lire et réconcilier les données Dexie.
2. **Source de vérité distante (Persistance partagée)** : **Supabase PostgreSQL** (`profiles`, `chantiers`, `affectations`, `pointages`).

### Synchronisation Dexie ↔ Supabase (`SyncEngine`)
Le singleton `syncEngine` ([src/lib/sync.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/sync.ts)) orchestre uniquement la synchronisation fiable des **pointages** et la récupération globale des données :

```text
[UI Home.tsx]
   │  saveDailyPointage(input)
   ▼
[Dexie db.pointages]  ──(synced: false, index [profile_id+date])──▶ [NetworkBanner / Plus]
   │                                                                   (affiche N en attente)
   │  triggerSync() si navigator.onLine
   ▼
[Supabase Auth getSession()]
   ├── Pas de JWT (Mode Démo local) ──▶ Arrêt propre (requiresRealAuth: true)
   └── Session JWT active
         ├── UPSERT public.pointages ON CONFLICT (profile_id, date)
         │     (fallback automatique si heure_debut/heure_fin absents côté DB)
         ├── Mise à jour Dexie : synced: true, synchronise_le, id serveur
         └── pullRemoteData() : télécharge chantiers, profiles, affectations, pointages (limit 300)
               └── Réconcilie Dexie sans écraser les lignes !local.synced
```

> **Point d'attention architectural** : contrairement aux `pointages`, les mutations de chantiers et d'affectations passent désormais par [src/lib/chantiersService.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/chantiersService.ts) : avec une session Supabase active, l'appel distant est vérifié en premier et remonte explicitement toute erreur RLS/réseau vers la bannière UI existante avant de mettre à jour Dexie (sans file d'attente offline dédiée pour les chantiers). En mode démo locale (sans session JWT), la mutation s'applique localement dans Dexie.

### Gestion d'état : Context, `localStorage`, Hooks & Props
- **Contexte Auth (`AuthContext`)** ([src/context/AuthContext.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/context/AuthContext.tsx)) : expose `profile`, `role`, `loading`, `isOnline`, `isDemo`, `login`, `loginDemo`, `logout`. Au démarrage, il restaure immédiatement le profil depuis `localStorage` + `db.profiles.get(...)`, puis vérifie la session Supabase si en ligne.
- **Contexte Thème (`ThemeProvider` & `useTheme`)** ([src/context/ThemeContext.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/context/ThemeContext.tsx), [src/context/useTheme.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/context/useTheme.ts), [src/lib/theme.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/theme.ts)) : expose `{ theme, resolvedTheme, setTheme }`, écoute `prefers-color-scheme: dark` en temps réel lorsque `theme === 'system'` et les événements `storage` inter-onglets, et synchronise `.dark` sur `<html>`, `color-scheme`, le fond racine et `<meta name="theme-color">` (`#15302F` en clair, `#0F1D1C` en sombre).
- **Initialisation synchrone anti-FOUC ([index.html](file:///home/quent/Work/Perso/Paysage-Concept-MVP/index.html))** : un script inline minimal dans `<head>` lit `paysage_theme_preference` avant le montage React, résout `'system' | 'light' | 'dark'` via `matchMedia` et applique immédiatement `.dark`, `color-scheme`, `backgroundColor` et `meta[name="theme-color"]` afin d'éviter tout flash clair au lancement de la PWA.
- **Hooks de domaine (`src/hooks/`)** : chaque page principale délègue son état React et sa réactivité Dexie/`syncEngine` à un hook dédié (`useHomeDashboard`, `usePlanningData`, `useChantiersCatalog`, `useChantierDetail`, `usePlusDiagnostics`).
- **Bus d'événements `syncEngine.subscribe`** : mécanisme pub/sub maison (`listeners: Array<() => void>`) utilisé par les hooks de pages et `NetworkBanner` pour recharger leurs états locaux après une écriture ou une synchronisation.
- **Persistance `localStorage`** :
  - `paysage_active_profile_id` : UUID du profil actif pour restauration instantanée offline.
  - `paysage_is_demo` : `'true'` si session en mode démo locale sans JWT Supabase.
  - `paysage_daily_target[_<profileId>]` : objectif journalier en heures (défaut `7.0`, borné `[1, 24]`).
  - `paysage_last_time_range[_<profileId>]` : JSON `{ heureDebut, heureFin }` des derniers horaires validés.
  - `paysage_theme_preference` : préférence d'affichage (`'system'` par défaut, `'light'`, `'dark'`).
- **Props vs Context** : les composants réutilisables (`WeeklyCalendarStrip`, `HoursAnalyticsSection`, `ChatRoomView`, `DateSelectorPill`, `src/components/{home,planning,chantiers,analytics,auth}/*`) sont purement pilotés par props et callbacks ; seuls `AppLayout`, `NetworkBanner`, `Equipe`, `Login`, `ThemeSelector`, `CircularProgressGauge`, `HoursBarChartSVG` et les hooks consomment `useAuth()` / `useTheme()`.

### Routage, Code-Splitting & Contrôle d'accès ([src/App.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/App.tsx))
- **Code-splitting par route** : `Login`, `Planning`, `Chantiers`, `ChantierDetail`, `Equipe`, `ChatPreview` et `Plus` sont chargés en `React.lazy` avec un `<Suspense fallback={<RouteLoadingFallback />}>` ; seul `Home` reste importé de manière synchrone (eager) pour garantir un rendu instantané de l'écran d'accueil.
- `/login` (`PublicRoute`) : redirige vers `/` si `profile` est défini.
- `/` (`ProtectedRoute` -> `AppLayout`) : redirige vers `/login` si `!profile`.
  - `/` (`index`) : `Home` (eager)
  - `/planning` : `Planning` (lazy)
  - `/chantiers` (`SupervisorRoute`) : `Chantiers` (lazy, redirige `ouvrier` vers `/`)
  - `/chantier/:id` : `ChantierDetail` (lazy, bloque l'`ouvrier` s'il n'a aucune affectation sur ce chantier)
  - `/equipe` : `Equipe` (lazy)
  - `/chat` : `ChatPreview` (lazy)
  - `/plus` : `Plus` (lazy)
- `*` : redirection vers `/`.

---

## 3. Cycle de vie PWA, Offline & Déploiement

### Configuration VitePWA ([vite.config.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/vite.config.ts))
- **Stratégie de mise à jour** : `registerType: 'autoUpdate'`, générant `dist/registerSW.js` et `dist/sw.js` (et `dev-dist/` en développement grâce à `devOptions: { enabled: true }`).
- **Base & Portabilité GitHub Pages** : `base` et `manifest.id` utilisent `process.env.VITE_BASE_PATH || '/'`. `start_url` et `scope` sont relatifs (`'./'`).
- **Manifest** : `name: "Paysage Concept"`, `short_name: "Paysage"`, `display: "standalone"`, `orientation: "portrait"`, `theme_color` et `background_color` à `#15302F`, icônes `192x192` et `512x512` (`any` + `maskable`).
- **Déploiement SPA** : `.github/workflows/deploy.yml` injecte `VITE_BASE_PATH` et copie `dist/index.html` vers `dist/404.html` afin de préserver les routes React Router au rafraîchissement.

### Stratégie de cache Workbox
- Mode `generateSW` avec `globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}']`.
- Au build actuel (après nettoyage des assets orphelins et code-splitting par route), Workbox précache **38 entrées pour 1617.54 KiB** (~56 % de réduction vs 3670.85 KiB initial).
- **Appels réseau dynamiques** : aucune règle `runtimeCaching` spécifique n'est configurée dans `vite.config.ts`. Les appels vers Supabase et Open-Meteo (`https://api.open-meteo.com/v1/forecast`) reposent donc sur la connectivité directe :
  - Si hors-ligne, `syncEngine` diffère l'envoi des pointages dans Dexie (`synced: false`).
  - Si hors-ligne ou timeout > `3000 ms`, `fetchChantierWeather()` ([src/lib/weather.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/weather.ts)) retourne un fallback statique (`19°C`, `'Partiellement nuageux (hors-ligne)'`).

### Persistance IndexedDB (`PaysageConceptDB` — [src/lib/db.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/db.ts))
| Table | Version 1 (obsolète) | Version 2 (active) | Notes |
|---|---|---|---|
| `pointages` | `id, profile_id, chantier_id, type, horodatage, synced` | `id, profile_id, chantier_id, date, [profile_id+date], synchronise_le, synced` | `.upgrade()` purge la table `pointages` lors du passage v1 → v2 |
| `chantiers` | `id, statut` | `id, statut` | Initialisé via `INITIAL_CHANTIERS` si vide |
| `affectations` | `id, chantier_id, profile_id, date_intervention` | `id, chantier_id, profile_id, date_intervention` | Initialisé pour J-1 à J+5 via `generateInitialAffectations()` si vide |
| `profiles` | `id, role` | `id, role` | Initialisé avec 5 profils via `INITIAL_PROFILES` si vide |

---

## 4. Schémas des modèles de données principaux

### Types métier ([src/types/database.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/types/database.ts))

```ts
export type UserRole = 'admin' | 'chef_equipe' | 'ouvrier';
export type ChantierStatut = 'en_attente' | 'en_cours' | 'termine';

export interface Profile {
  id: string;                 // UUID (aligné avec auth.users.id côté Supabase)
  nom: string;
  prenom: string;
  telephone?: string | null;
  role: UserRole;
  email?: string;
  created_at?: string;
}

export interface Chantier {
  id: string;                 // UUID
  nom_client: string;
  adresse: string;
  statut: ChantierStatut;
  date_debut?: string | null; // YYYY-MM-DD
  date_fin?: string | null;   // YYYY-MM-DD
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_client?: string | null;
  telephone_client?: string | null;
  consignes_securite?: string | null;
}

export interface Affectation {
  id: string;                 // UUID
  chantier_id: string;        // FK -> chantiers.id
  profile_id: string;         // FK -> profiles.id
  date_intervention: string;  // YYYY-MM-DD
  chantier?: Chantier;
  profile?: Profile;
}

export interface Pointage {
  id: string;
  profile_id: string;
  chantier_id?: string | null;
  date: string;               // YYYY-MM-DD
  heure_debut?: string | null;// HH:mm ou HH:mm:ss
  heure_fin?: string | null;  // HH:mm ou HH:mm:ss
  heures_totales: number;     // Durée nette travaillée (pause déduite), heures sup incluses
  temps_pause: number;        // Heures décimales (défaut 0.5)
  heures_sup: number;         // Heures décimales <= heures_totales
  synchronise_le?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PointageLocal extends Pointage {
  synced: boolean;            // false tant que l'upsert Supabase n'a pas réussi
  error?: string | null;      // Dernier message d'erreur de synchro
}
```

### Schéma SQL `public.pointages` ([migrations](file:///home/quent/Work/Perso/Paysage-Concept-MVP/supabase/migrations/20261028_refactor_pointages_declaratif.sql))
- Clé primaire `id UUID DEFAULT gen_random_uuid()`, FK `profile_id -> public.profiles(id) ON DELETE CASCADE`, FK `chantier_id -> public.chantiers(id) ON DELETE SET NULL`.
- Colonnes ajoutées par [20261111_add_time_ranges_to_pointages.sql](file:///home/quent/Work/Perso/Paysage-Concept-MVP/supabase/migrations/20261111_add_time_ranges_to_pointages.sql) : `heure_debut TIME NULL`, `heure_fin TIME NULL`.
- Contraintes :
  - `UNIQUE (profile_id, date)` (`pointages_profile_date_unique`) — socle de l'idempotence `UPSERT`.
  - `heures_totales`, `temps_pause`, `heures_sup` entre `0` et `24` (`NUMERIC(4,2)`).
  - `heures_sup <= heures_totales` (`pointages_heures_sup_le_totales`).
- RLS (`authenticated`) : `SELECT` ouvert (`USING (true)`), `INSERT`/`UPDATE`/`DELETE` autorisés pour `auth.uid() = profile_id` ou rôle `chef_equipe`/`admin`.

### Modèle Chat Mock ([src/types/chat.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/types/chat.ts))

```ts
export type ChannelCategory = 'equipe' | 'chantier' | 'direction';
export type FilterCategory = 'tous' | ChannelCategory;

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isOutgoing: boolean;
  avatar?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  category: ChannelCategory;
  subtitle: string;
  time: string;
  unreadCount: number;
  chantierId?: string;
  participantsCount?: number;
  messages: ChatMessage[];
}
```
