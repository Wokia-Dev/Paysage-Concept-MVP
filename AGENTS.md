# AGENTS.md — Paysage Concept (V1)

Guide opérationnel de référence pour tout agent IA ou développeur intervenant sur ce dépôt.

---

## 1. Résumé technique & Stack

Application PWA **mobile-first** et **offline-first** destinée aux équipes terrain de paysagistes (ouvriers, chefs d'équipe, administrateurs) : suivi des chantiers, planning multi-vues, annuaire équipe, messagerie mockée (Phase 2) et pointage déclaratif journalier par plages horaires.

| Couche | Technologie & Version (`package.json`) | Rôle |
|---|---|---|
| UI / Runtime | React `19.2.8`, React DOM `19.2.8`, TypeScript `~6.0.2` | SPA client-side |
| Bundler & PWA | Vite `8.3.0`, `vite-plugin-pwa` `1.3.0` (Workbox `generateSW`) | Build, manifest, Service Worker `autoUpdate` |
| Styling & Icônes | Tailwind CSS `4.3.3` (`@tailwindcss/vite`), `lucide-react` `1.47.0` | Design system biophilique via `@theme` dans `src/index.css` |
| Routing | `react-router-dom` `7.18.4` (`BrowserRouter` avec `import.meta.env.BASE_URL`) | Navigation 5 onglets + routes protégées par rôle |
| Stockage local | Dexie `4.4.6` (`PaysageConceptDB` IndexedDB v2) + `localStorage` | Cache offline-first et persistance préférences |
| Backend / Auth | `@supabase/supabase-js` `2.116.0` | Auth JWT, PostgreSQL + RLS, synchro `pointages` & mutations `chantiers` |
| Qualité & Tests | ESLint `10.10.0` (`typescript-eslint` `8.69.0`), `node --test` | 135 suites / 503 tests (unitaires, invariants, audit statique) |

---

## 2. Commandes essentielles

```bash
npm run dev      # Serveur Vite avec PWA devOptions activées (génère dev-dist/)
npm run build    # Compilation TypeScript strict (tsc -b) + bundle Vite + Service Worker dist/sw.js
npm run preview  # Prévisualisation locale du build de production (inclut PWA / SW dist/)
npm run lint     # Analyse ESLint sur tout le dépôt (hors dist/ et dev-dist/)
npm test         # Exécute les tests Node (node --test sur src/__tests__/*.test.ts)

# Vérification TypeScript strict explicite (strict: true activé dans tsconfig.app.json & tsconfig.node.json)
npx tsc -p tsconfig.app.json --strict --noEmit
npx tsc -p tsconfig.node.json --strict --noEmit
```

---

## 3. Cartographie de la documentation (`docs/`)

- [docs/ARCHITECTURE.md](file:///home/quent/Work/Perso/Paysage-Concept-MVP/docs/ARCHITECTURE.md) : arborescence commentée, flux de données Dexie ↔ Supabase, cycle de vie PWA/Workbox, stratégie offline et schémas TypeScript/SQL.
- [docs/FEATURES.md](file:///home/quent/Work/Perso/Paysage-Concept-MVP/docs/FEATURES.md) : inventaire exhaustif des fonctionnalités V1, parcours par rôle (`ouvrier`, `chef_equipe`, `admin`), règles métier et formules de calcul d'heures.
- [docs/TECH_DEBT.md](file:///home/quent/Work/Perso/Paysage-Concept-MVP/docs/TECH_DEBT.md) : audit factuel de la dette technique (monolithes, duplications, code mort, failles de synchro offline, fragilités) et plan de refactoring atomique priorisé.
- Références complémentaires existantes : [PROJECT.md](file:///home/quent/Work/Perso/Paysage-Concept-MVP/PROJECT.md), [TEST_INFRA.md](file:///home/quent/Work/Perso/Paysage-Concept-MVP/TEST_INFRA.md), [supabase/README.md](file:///home/quent/Work/Perso/Paysage-Concept-MVP/supabase/README.md).

---

## 4. Règles d'architecture et conventions strictes

### TypeScript & Qualité
- **Typage strict** : `"strict": true` est activé dans `tsconfig.app.json` et `tsconfig.node.json`. Interdiction d'introduire `any`, `@ts-ignore`, `@ts-nocheck` ou d'abuser des assertions non-null `!` pour masquer des cas `null`/`undefined`.
- **Contraintes `tsconfig.app.json`** : respecter `verbatimModuleSyntax: true` (`import type` obligatoire pour les types), `erasableSyntaxOnly: true` (pas d'`enum` TS ni de parameter properties), `noUnusedLocals` et `noUnusedParameters`.
- **Compatibilité `node --test`** : les modules importés directement par les tests Node (`src/lib/*`) doivent utiliser des extensions `.ts` sur leurs imports relatifs et garder les accès `import.meta.env` protégés (ex. [src/lib/supabase.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/supabase.ts)).

### Architecture & Séparation UI / Logique métier
- **Organisation des modules** :
  - `src/types/` : interfaces métier partagées (`database.ts`, `chat.ts`).
  - `src/lib/` : logique métier pure et services sans dépendance React (`hours.ts`, `hoursAnalytics.ts`, `planningUtils.ts`, `dates.ts`, `formatters.ts`, `weather.ts`, `db.ts`, `sync.ts`, `chantiersService.ts`, `supabase.ts`).
  - `src/hooks/` : hooks d'état et d'orchestration par page (`useHomeDashboard.ts`, `usePlanningData.ts`, `useChantiersCatalog.ts`, `useChantierDetail.ts`, `usePlusDiagnostics.ts`).
  - `src/components/` : sous-composants modulaires classés par domaine (`analytics/`, `auth/`, `chantiers/`, `common/`, `home/`, `layout/`, `modules/`, `planning/`).
  - `src/pages/` : pages légères chargées en lazy-loading via `React.lazy` + `Suspense` dans [src/App.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/App.tsx) (sauf `Home` qui reste eager pour l'écran d'accueil offline).
  - `src/data/` : jeux de données statiques Phase 2 (`mockChannels.ts`).
- **Logique métier pure** : tout calcul ou validation d'heures doit résider dans [src/lib/hours.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/hours.ts) (et [src/lib/hoursAnalytics.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/hoursAnalytics.ts) pour les agrégations), sans dépendance DOM/React.
- **Accès données & synchro** : ne pas appeler `supabase.from(...)` ni `db.*` directement dans les composants de présentation ; passer par [src/lib/sync.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/sync.ts), [src/lib/chantiersService.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/chantiersService.ts) et les hooks de `src/hooks/`.
- **Helpers partagés** : utiliser [src/lib/dates.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/dates.ts) (`getTodayDateString`, `parseMiddayUTC`, `formatISODate`, `getISOWeekNumber`, etc.) et [src/lib/formatters.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/formatters.ts) (`generateUUID`, `getStatusBadge`, `getRoleLabel`, `getInitials`, `getMapsUrl`, `sanitizePhoneHref`) — ne jamais les dupliquer dans les pages/composants.
- **Taille maximale recommandée** : viser **<= 250–300 lignes** par composant/page. Tout dépassement impose une extraction en sous-composants (`src/components/`) ou hooks dédiés.

### Ergonomie & Design System (`src/index.css`)
- **Tokens obligatoires** : `--color-foret` (`#15302F`), `--color-sauge` (`#8FA98F`), `--color-sable` (`#E8E3D9`), `--color-craie` (`#FAFAFB`), `--color-terracotta` (`#C47452`), `--color-blanc` (`#FFFFFF`), `--color-muted` (`#6B7280`).
- **Terrain plein soleil** : cibles tactiles minimales `48x48px` (`min-w-[48px] min-h-[48px]`), contraste WCAG AA, support des safe-areas iOS/Android (`pt-safe`, `pb-safe`, `env(safe-area-inset-*)`).
- **Chat Phase 2** : [ChatPreview.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/pages/ChatPreview.tsx) et [ChatRoomView.tsx](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/components/modules/ChatRoomView.tsx) utilisent des données mockées statiques — ne pas brancher de canal Supabase Realtime sans demande explicite.

### Gestion des erreurs
- Ne jamais avaler silencieusement une erreur sur une action utilisateur (écriture Dexie, synchronisation, création/modification). Afficher un feedback explicite à l'utilisateur et gérer proprement la distinction entre compte **Démo locale** (`isDemo === true`) et **session Supabase JWT**.

### Règles PWA, Cache & Contrats de tests
- **Schéma Dexie** : ne jamais casser la compatibilité de `PaysageConceptDB` v2 ([src/lib/db.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/lib/db.ts)) ni supprimer l'index composé `[profile_id+date]` sans migration `.upgrade()` testée.
- **Base path & Assets** : conserver la compatibilité `VITE_BASE_PATH` (GitHub Pages) dans [vite.config.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/vite.config.ts) (`base`, `manifest.id`) et `BrowserRouter` (`import.meta.env.BASE_URL`). Surveiller le poids du precache Workbox lors d'ajouts dans `public/`.
- **Vigilance tests statiques (`src/__tests__/`)** : plusieurs fichiers de tests utilisent `readFileSync` (souvent via [src/__tests__/helpers/sourceReader.ts](file:///home/quent/Work/Perso/Paysage-Concept-MVP/src/__tests__/helpers/sourceReader.ts) pour agréger hooks/sous-composants d'un écran) + regex sur le code source (ex. `isEditingTarget`, `calculateAutoOvertime`, `calculateNormalHours`, `DateSelectorPill`, `getStatusBadge`, `parseMiddayUTC`, classes CSS précises). Consulter les tests impactés avant tout renommage ou déplacement de fichier.
- **Absence de code legacy pointeuse** : ne jamais réintroduire `PointageType`, `geolocation.ts`, `getQuickGeolocation`, `handlePointage(`, `'arrivee'` ou `'depart'`.

---

## 5. Checklist obligatoire avant de clôturer toute tâche

1. [ ] `npm run lint` passe sans erreur (et sans nouveau warning).
2. [ ] `npm run build` (`tsc -b && vite build`) réussit sans erreur ; vérifier la taille des chunks et les fichiers générés par `VitePWA`.
3. [ ] `npx tsc -p tsconfig.app.json --strict --noEmit` et `npx tsc -p tsconfig.node.json --strict --noEmit` passent sans erreur.
4. [ ] `npm test` passe à 100 % (`0 fail`, `0 skipped` non justifié).
5. [ ] Non-régression vérifiée sur les invariants métier (`normalHours + heures_sup === heures_totales`), la séparation des rôles (`ouvrier` vs `chef_equipe`/`admin`) et le mode hors-ligne (Dexie + fallback UI).
6. [ ] Aucun fichier temporaire, secret ou modification hors périmètre laissé dans le dépôt.
