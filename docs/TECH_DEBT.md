# Diagnostic de Dette Technique & Suivi du Refactoring — Paysage Concept (V1)

Audit mis à jour après exécution des Phases 1–3 + code-splitting par route, vérifié par `npm run lint` (0 erreur, 0 warning), `tsc --strict --noEmit`, `npm run build` (`precache 38 entries / 1617.54 KiB`) et `npm test` (`135 suites / 503 tests`).

---

## 1. État des points audités (Résolus vs Restants)

### A. Composants monolithiques et mélange des responsabilités — **[x] Résolu**
Les 5 monolithes ont été découpés en hooks d'état (`src/hooks/`), utilitaires/services purs (`src/lib/`) et sous-composants modulaires (`src/components/`) :
- [x] [src/pages/Home.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Home.tsx) (**1 460 → 222 lignes**) : logique extraite dans [useHomeDashboard.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/hooks/useHomeDashboard.ts) et UI scindée dans `src/components/home/` (`HomeHeader`, `HeroChantierCard`, `DailyTargetEditor`, `TimeRangeField`, `TimeOvertimeAccordion`, `TimeDeclarationModal`, `TeamDailySummaryCard`, `DailyDeclarationSummary`).
- [x] [src/pages/Planning.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Planning.tsx) (**1 044 → 163 lignes**) : calculs extraits dans [planningUtils.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/planningUtils.ts), état dans [usePlanningData.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/hooks/usePlanningData.ts), vues dans `src/components/planning/` (`PlanningDayView`, `PlanningWeekView`, `PlanningMonthView`, `MemberContactModal`).
- [x] [src/pages/Chantiers.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/Chantiers.tsx) (**911 → 194 lignes**) : mutations extraites dans [chantiersService.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/chantiersService.ts), état dans [useChantiersCatalog.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/hooks/useChantiersCatalog.ts), UI dans `src/components/chantiers/` (`ChantierCard`, `ChantierFormModal`, `ChantierAssignModal`).
- [x] [src/components/common/HoursAnalyticsSection.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/common/HoursAnalyticsSection.tsx) (**822 → 277 lignes**) : calculs purs extraits dans [hoursAnalytics.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/hoursAnalytics.ts), rendu scindé dans `src/components/analytics/` (`HoursBarChartSVG`, `PointagesHistoryList`).
- [x] [src/pages/ChantierDetail.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/ChantierDetail.tsx) (**631 → 228 lignes**) : état dans [useChantierDetail.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/hooks/useChantierDetail.ts), sections dans `src/components/chantiers/` (`ChantierTeamSection`, `ChantierDocumentsSection`, `ChantierSupervisorPanel`).
- [x] Extraction complémentaire : [usePlusDiagnostics.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/hooks/usePlusDiagnostics.ts) (`Plus.tsx` → **264 lignes**), [DemoAccountsPanel.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/auth/DemoAccountsPanel.tsx) (`Login.tsx` → **327 lignes**) et [src/data/mockChannels.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/data/mockChannels.ts) (`ChatPreview.tsx` → **263 lignes**).

### B. Couplage UI ↔ Persistance & Synchronisation
- [x] **Extraction des mutations `chantiers` / `affectations` + remontée explicite des erreurs Supabase** : toutes les mutations passent par [src/lib/chantiersService.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/chantiersService.ts). En session JWT active, l'erreur `{ error }` de Supabase est vérifiée avant la mise à jour Dexie et remontée explicitement dans les toasts/bannières existants (`feedbackMessage` dans `Chantiers`, `actionFeedback` dans `ChantierDetail`).
- [x] **`syncPendingPointages` conserve `pt.profile_id`** : [src/lib/sync.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/sync.ts) utilise désormais `pt.profile_id || session.user.id` et ignore les pointages d'autres profils si l'utilisateur connecté n'est ni `chef_equipe` ni `admin`.
- [ ] **À surveiller (évolution future) — File d'attente offline dédiée `chantiers`/`affectations`** : aucune colonne `synced` ni table outbox n'existe dans `PaysageConceptDB` v2 (schéma figé pour rétrocompatibilité). En session JWT hors-ligne, `chantiersService` retourne une erreur explicite au superviseur au lieu d'accepter une modification silencieusement vouée à être écrasée.
- [ ] **À surveiller (évolution future) — Suppressions distantes non propagées dans Dexie** : `syncEngine.pullRemoteData()` ([src/lib/sync.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/sync.ts)) utilise toujours `bulkPut` sur `chantiers`, `profiles` et `affectations` ; une suppression côté Supabase reste en cache local tant qu'une réconciliation différentielle n'est pas implémentée.

### C. Duplications identifiées — **[x] Résolu**
- [x] `generateUUID()`, `getRoleLabel()`, `getInitials()`, `getStatusBadge()`, `getMapsUrl()`, `sanitizePhoneHref()` centralisés dans [src/lib/formatters.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/formatters.ts).
- [x] `getTodayDateString()`, `parseMiddayUTC()`, `formatISODate()`, `getISOWeekNumber()`, `getWeekMonday()`, `formatFrenchMonthYear()`, `formatFrenchWeekdayDate()`, `formatFrenchShortDate()` centralisés dans [src/lib/dates.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/dates.ts) (avec ré-export de `getTodayDateString` depuis `db.ts`).

### D. Code mort, dépendances inutilisées et surcharge PWA — **[x] Résolu**
- [x] `@tanstack/react-query` retiré de `package.json` et de [src/App.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/App.tsx) (ainsi que `clsx` et `tailwind-merge`, devenus inutilisés).
- [x] Fichiers/types morts supprimés : `src/App.css`, `src/lib/utils.ts`, `ConversationType`, `supabase_seed.sql` (dupliqué de `supabase_clean_seed.sql`).
- [x] Composant caché `DateSelectorPill` supprimé de `src/pages/Home.tsx` (`src/components/common/DateSelectorPill.tsx` conservé comme composant réutilisable).
- [x] Assets orphelins supprimés : `src/assets/{hero.png,react.svg,vite.svg}`, `public/hero-paysage_back{,2,3,4}.jpg`, `public/{icons,logo-outline,pwa-icon}.svg`. Precache Workbox réduit de **3 670.85 KiB (28 entrées)** à **1 615.93 KiB (38 entrées)**.

### E. Configuration TypeScript, Lint & Bundle — **[x] Résolu**
- [x] `"strict": true` activé dans [tsconfig.app.json](file:///home/quent/Work/Perso/Paysage-Concept-MVP/tsconfig.app.json) et [tsconfig.node.json](file:///home/quent/Work/Perso/Paysage-Concept-MVP/tsconfig.node.json) (0 erreur sans `as any` ni abus de `!`).
- [x] Warning ESLint `isModalOpen` dans `Home` résolu ; `npm run lint` passe avec **0 erreur et 0 warning**.
- [x] Code-splitting par route via `React.lazy` + `Suspense` dans [src/App.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/App.tsx) (chunk principal réduit de `813.75 kB` à **`666.95 kB`** / `193.07 kB` gzip, avec chunks dédiés par page).

### F. Bugs comportementaux corrigés & Points restants à surveiller
- [x] **Double appel réseau au montage de `Home`** : résolu via `useRef` et montage unique dans [useHomeDashboard.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/hooks/useHomeDashboard.ts).
- [x] **Réinitialisation du formulaire au retour sur `todayStr`** : corrigé dans `useHomeDashboard.ts` lorsque l'utilisateur revient sur la date du jour non encore pointée (tout en préservant une saisie en cours si la modale est déjà ouverte).
- [x] **Synchronisation de `selectedDateStr` dans `HoursAnalyticsSection.tsx`** : `refDateStr` et `activeChartDate` se resynchronisent proprement quand la prop `selectedDateStr` change depuis le parent.
- [ ] **À surveiller — Badge Chat statique (`'2'`)** dans [BottomNav.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/layout/BottomNav.tsx) : non relié dynamiquement à `INITIAL_CHANNELS` (Phase 2).
- [ ] **À surveiller — Cohérence seed Dexie vs SQL** : `TECHLID` est `'en_cours'` dans `db.ts` vs `'termine'` dans `supabase_clean_seed.sql`, et les coordonnées GPS/contacts sont plus riches dans `db.ts`.
- [ ] **À surveiller — Placeholders `ChantierDetail`** : dates fallback (`'15/09'` / `'30/09'`) et cartes PDF mockées statiques (`Plan d'aménagement.pdf`, `Devis signé.pdf`) dans `ChantierDocumentsSection.tsx` / `ChantierDetail.tsx`.
- [ ] **À surveiller — Fallback Supabase hardcodé** : [src/lib/supabase.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/supabase.ts) garde les valeurs publiques de repli si `.env` est absent (et protège désormais `import.meta.env` pour `node --test`).
- [ ] **À surveiller — Taille & modernisation des tests** : `useHomeDashboard.ts` (439 lignes) et `Login.tsx` (327 lignes) restent légèrement au-dessus du seuil de 300 lignes ; côté tests, des suites unitaires ciblées ont été ajoutées dans [refactored_modules_unit.test.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/__tests__/refactored_modules_unit.test.ts), mais plusieurs tests historiques inspectent encore les sources via regex ([sourceReader.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/__tests__/helpers/sourceReader.ts)) et pourront évoluer vers des tests DOM / E2E Playwright en Phase 4.

---

## 2. Synthèse d'avancement du plan d'action

| Phase | Contenu | Statut |
|---|---|---|
| Phase 1 | `strict: true`, suppression code mort/assets PWA, helpers `dates.ts` & `formatters.ts` | **Terminé** |
| Phase 2 | Fix double chargement `Home`, reset formulaire `todayStr`, sync `HoursAnalyticsSection`, `chantiersService.ts`, fix `syncPendingPointages` | **Terminé** |
| Phase 3 | Découpage modulaire `Home`, `Planning`, `Chantiers`, `ChantierDetail`, `HoursAnalyticsSection`, `Plus`, `Login`, `ChatPreview` | **Terminé** |
| Phase 4 | Code-splitting par route (`React.lazy` + `Suspense`) & tests unitaires modules extraits | **Partiel (Code-splitting & tests unitaires faits ; migration DOM/Playwright & outbox chantiers hors scope V1)** |
