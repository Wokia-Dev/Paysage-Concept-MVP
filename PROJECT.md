# Project: Paysage Concept React PWA Redesign

## Architecture
- **Framework**: React 19 + TypeScript + Vite + vite-plugin-pwa (Service Worker / Offline caching).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` with `@theme` in `src/index.css`), organic rounded cards (`rounded-2xl` to `rounded-3xl`), soft diffuse shadow (`shadow-[0_4px_20px_rgba(21,48,47,0.06)]`).
- **Ergonomics**: Outdoor bright daylight readability (WCAG AA high contrast), min 48x48px touch targets, mobile safe area insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`).
- **Navigation**: Persistent 5-tab bottom navigation (`Accueil`, `Planning`, `Équipe`, `Chat`, `Plus`) for all roles, with Forest Green active states, Sage Green indicator dots, Terracotta unread badge.
- **Data & Offline Layer**: Dexie.js (IndexedDB v2 with compound index `[profile_id+date]`) + Supabase client for remote sync. Declarative time-tracking (`heures_totales`, `temps_pause`, `heures_sup`, daily target).
- **Chat UI**: 100% static mock data with channel tabs and message preview room; decoupled from live Supabase Realtime.
- **Deferred Modules**: Job site photo captures, photo galleries, and file uploads are deferred to future phases (represented by clean typographic placeholder cards).

## Feature Inventory
Every feature from user requirements and the survey phase is inventoried and mapped to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Exact Color Palette Tokens | Forest `#15302F`, Sage `#8FA98F`, Sand `#E8E3D9`, Craie `#FAFAFB`, Terracotta `#C47452`, White `#FFFFFF`, Muted `#6B7280` | M1 | R1, Survey |
| 2 | Typography & Organic Cards | Modern sans-serif stack, `rounded-2xl`/`rounded-3xl`, soft diffuse shadow `shadow-[0_4px_20px_rgba(21,48,47,0.06)]` | M1 | R1, Survey |
| 3 | Outdoor Ergonomics & Safe Areas | Min 48x48px touch targets, WCAG AA contrast, `pt-safe` and `pb-safe` handling | M1 | R1, R2, Survey |
| 4 | Persistent 5-Tab Bottom Bar | Always 5 tabs (Accueil, Planning, Équipe, Chat, Plus), Forest Green active, Sage indicator dot, Terracotta unread badge | M1 | R2, Survey |
| 5 | App Shell Unified Layout | Biophilic Forest Green curved header support, unified styling across all 5 tab sections | M1 | R2, Survey |
| 6 | Home Header & Personal Greeting | `Bonjour [Prénom] 👋`, subtitle, user avatar, bell with Terracotta indicator | M2 | R3, Survey |
| 7 | Date Selector Pill | Date navigation pill with previous/next day quick arrows | M2 | R3, Survey |
| 8 | Quick Glance Horizontal Row | 3 quick glance pills: assigned chantier, logged hours, unread chat | M2 | R3, Survey |
| 9 | Hero Chantier Card | Typographic card with status badge (`En cours`), address with map pin, start time (no photo thumbnail) | M2 | R3, Survey |
| 10 | Daily Hours Circular Gauge | Horseshoe donut progress ring comparing `heures_totales` to editable daily target (default 7h) | M2 | R4, Survey |
| 11 | Declarative Hours Form & Steppers | Steppers (>= 48x48px) for `heures_totales`, `temps_pause`, `heures_sup`, submit/update action | M2 | R4, Survey |
| 12 | Real-time Breakdown & Auto-overtime | Real-time calculation badge (`8h = 7h normales + 1h sup`), auto-overtime, validation, strict preservation of test regex strings | M2 | R4, Survey |
| 13 | Daily Widget Strip & History | Weather conditions, tasks summary badge, quote pill, and weekly hour history | M2 | R3, R4, Survey |
| 14 | Planning 3-State Period Toggle | Toggle `Jour \| Semaine \| Mois` with updated views | M3 | R5, Survey |
| 15 | Planning Schedule & Presence Card | Day schedule with timeline steps, team presence card (`X/Y présents`), daily notes banner | M3 | R5, Survey |
| 16 | Fiche Chantier Typographic Layout | Client name, formatted address, direct GPS navigation link (`maps.google.com/?q=...`), status badge | M3 | R5, Survey |
| 17 | Fiche Chantier Team & Placeholders | Assigned team avatar row, document placeholder cards (`Plan d'aménagement.pdf`, `Devis signé.pdf`), photo placeholder, chat shortcut | M3 | R5, Survey |
| 18 | Chat Channel Filter Tabs | Tabs: `Tous \| Équipe \| Chantier \| Direction` with active states | M4 | R6, Survey |
| 19 | Chat Conversation List & Badges | Conversation rows with category, snippet, timestamp, Terracotta unread badges | M4 | R6, Survey |
| 20 | Chat Preview Room UI | Forest Green outgoing message bubbles, Light Sand incoming bubbles, 100% static mock data | M4 | R6, Survey |
| 21 | Secondary Screens Polish | Unified design system applied to `Equipe.tsx`, `Plus.tsx`, and supervisor `Chantiers.tsx` | M4 | R2, Survey |
| 22 | Non-Regression & Quality Assurance | Supabase auth, Dexie offline cache, RLS policies, 100% passing tests, zero lint/build errors | M5 | R6, AC |
| 23 | E2E Testing Suite & Hardening | Complete Tiers 1-4 test execution + Tier 5 adversarial coverage hardening | M5 | Project Pattern |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System, Tokens & App Shell Navigation | Theme CSS tokens (fix `--color-sauge` to `#8FA98F`), shadow, touch targets, persistent 5-tab `BottomNav.tsx`, `AppLayout.tsx` | none | DONE |
| M2 | Home Dashboard & Declarative Time-Tracking | Greeting, date selector, quick glance pills, hero chantier card, circular gauge, steppers form, breakdown badge, test string invariants | M1 | DONE |
| M3 | Planning & Fiche Chantier Visual Redesign | 3-way toggle (Jour/Semaine/Mois), timeline steps, presence card, notes banner; typographic Fiche Chantier with GPS, team avatars, document placeholders | M1 | DONE |
| M4 | Chat UI & Secondary Screens Polish | Channel filter tabs, unread badges, mock room bubbles; design system polish on Équipe, Plus, Chantiers | M1 | DONE |
| M5 | Final Milestone: E2E Test Suite Pass & Adversarial Hardening | Phase 1: 100% pass of E2E test suite (Tiers 1-4). Phase 2: Tier 5 adversarial coverage hardening | M2, M3, M4 | DONE |

## Interface Contracts

### Design System Tokens (`src/index.css`)
- Primary Forest Green: `--color-foret: #15302F;`
- Secondary Sage Green: `--color-sauge: #8FA98F;` (Fixed from `#BFA98F`)
- Warm Sand Beige: `--color-sable: #E8E3D9;`
- Canvas Off-White: `--color-craie: #FAFAFB;`
- Accent Terracotta: `--color-terracotta: #C47452;`
- Pure White: `--color-blanc: #FFFFFF;`
- Muted Gray: `--color-muted: #6B7280;`
- Soft Diffuse Shadow: `shadow-[0_4px_20px_rgba(21,48,47,0.06)]`

### Bottom Navigation Contract (`src/components/layout/BottomNav.tsx`)
- Always provides 5 tabs:
  1. `Accueil` (`/`) -> Lucide `Home`
  2. `Planning` (`/planning`) -> Lucide `Calendar`
  3. `Équipe` (`/equipe`) -> Lucide `Users`
  4. `Chat` (`/chat`) -> Lucide `MessageSquare` with Terracotta unread badge
  5. `Plus` (`/plus`) -> Lucide `Sliders`
- Active state: `text-foret font-bold` with `w-1.5 h-1.5 bg-sauge rounded-full mt-1`.
- Touch target: minimum 48x48px per button.

### Declarative Hours Tracking Contract (`src/pages/Home.tsx` / `src/lib/hours.ts`)
- Invariant: `normalHours = heures_totales - heures_sup`, enforcing `normalHours + heures_sup === heures_totales`.
- Validation: `heures_totales >= 0`, `temps_pause >= 0`, `heures_sup >= 0`, max 24h, `heures_sup <= heures_totales`.
- Mandatory String Invariants for `pointages.test.ts`:
  - `isEditingTarget`
  - `calculateAutoOvertime`
  - `calculateNormalHours`
  - `Heures totales travaillées (heures sup incluses)`
  - `Dont heures supplémentaires`
  - `Ventilation du temps de travail`
  - `déjà incluses`
  - Zero presence of `PointageType`, `getQuickGeolocation`, `handlePointage(`, `'arrivee'`, `'depart'`.

### Chat Mock Data Contract (`src/types/chat.ts` / `src/pages/ChatPreview.tsx`)
- `ChannelCategory`: `'equipe' | 'chantier' | 'direction'`
- Static mock dataset with category filters, conversation cards, unread badges, and mock preview room with Forest Green (`#15302F`) outgoing bubbles and Sand (`#E8E3D9`) incoming bubbles.
- 0 live Supabase Realtime channels.

## Code Layout
- `src/index.css`: Theme variables, custom utility classes (`shadow-soft`, safe-area insets).
- `src/components/layout/`: `AppLayout.tsx`, `BottomNav.tsx`.
- `src/components/common/`: `CircularProgressGauge.tsx`, `DateSelectorPill.tsx`, `QuickGlanceRow.tsx`, `WidgetStrip.tsx`, `NetworkBanner.tsx`.
- `src/components/modules/`: `DeclarativeHoursModal.tsx` (or embedded in `Home.tsx`), `ChatRoomModal.tsx`.
- `src/pages/`: `Home.tsx`, `Planning.tsx`, `ChantierDetail.tsx`, `Chantiers.tsx`, `Equipe.tsx`, `ChatPreview.tsx`, `Plus.tsx`, `Login.tsx`.
- `src/lib/`: `db.ts`, `sync.ts`, `hours.ts`, `supabase.ts`, `weather.ts`, `utils.ts`.
- `src/types/`: `database.ts`, `chat.ts`.
- `src/__tests__/`: `pointages.test.ts`, plus new E2E and component test suites.
