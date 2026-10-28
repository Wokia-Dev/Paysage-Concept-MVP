# E2E Test Infrastructure: Paysage Concept React PWA Redesign

## 1. Test Philosophy & Framework
- **Approach**: Opaque-box, requirement-driven verification derived strictly from `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- **4-Tier Testing Methodology**:
  - **Tier 1 — Feature Coverage**: Representative happy-path tests verifying each feature in isolation against specification contracts.
  - **Tier 2 — Boundary & Corner Cases**: Value limits, 0h / 24h bounds, negative inputs rejection, non-finite values, decimal precision, contrast ratio extremes.
  - **Tier 3 — Cross-Feature Interactions**: Hours tracking + overtime auto-preselection + daily target persistence; navigation tabs + active states; chantier details + GPS links + team presence; Dexie offline upsert idempotency.
  - **Tier 4 — Real-World Application Workloads**: End-to-end field landscaper workflow (morning login -> view assigned chantier -> record worked hours with overtime -> Dexie offline cache -> check planning -> review team chat) and supervisor payroll aggregation.
- **Test Integrity**: Zero facade testing. All tests assert genuine functional logic, data constraints, mathematical invariants, or visual/ergonomic token compliance.
- **Runner**: Node.js built-in test runner (`node --test`) using `node:test` and `node:assert/strict`.

---

## 2. Feature Inventory & 4-Tier Test Matrix

| # | Feature | Req | Tier 1: Feature Coverage | Tier 2: Boundary & Corner | Tier 3: Cross-Feature Interactions | Tier 4: Real-World Workload |
|---|---------|:---:|--------------------------|---------------------------|-------------------------------------|-----------------------------|
| **F1** | Exact Color Palette Tokens | R1 | Brand hex tokens verified (`#15302F`, `#8FA98F`, `#E8E3D9`, `#FAFAFB`, `#C47452`, `#FFFFFF`, `#6B7280`) | Case-insensitivity, CSS variable formatting, missing token rejection | Theme token inheritance across App shell and navigation | Outdoor daylight high-contrast palette consistency |
| **F2** | Typography & Organic Cards | R1 | Sans-serif font stack, `rounded-2xl` (16px), `rounded-3xl` (24px) | Mixed border radii, invalid border class fallback | Soft diffuse shadow `shadow-[0_4px_20px_rgba(21,48,47,0.06)]` on cards | Visual hierarchy across card containers |
| **F3** | Outdoor Ergonomics & Safe Areas | R1, R2 | Min 48x48px touch targets, `pt-safe`, `pb-safe` handling | Zero safe-area fallback (0px default inset), sub-48px touch rejection | WCAG AA contrast ratio verification (> 4.5:1 for body, > 3:1 for large text) | Field ergonomics under bright outdoor sunlight |
| **F4** | Persistent 5-Tab Bottom Bar | R2 | Persistent 5 tabs (`Accueil`, `Planning`, `Équipe`, `Chat`, `Plus`) | Viewport resizing, safe-area inset preservation | Active state indicator (Forest Green text + Sage dot) vs inactive state | Landscaper multi-tab switching flow |
| **F5** | App Shell Unified Layout | R2 | Max-width constraint (`max-w-md`), desktop centering, sticky header | Viewport overflow prevention, scrollbar hiding (`no-scrollbar`) | Header connectivity banner + avatar + bottom bar co-existence | Full application lifecycle in PWA shell |
| **F6** | Home Header & Personal Greeting | R3 | `Bonjour [Prénom] 👋`, subtitle, user initials avatar | Null/empty profile name fallback to generic greeting ("Équipe") | Header greeting update on profile role switch | Morning application open & landscaper greeting |
| **F7** | Date Selector Pill | R3 | Current date formatted in French (`weekday, day month`), day navigation | Month-end and year-end date rollover boundaries | Selected date binding to pointage fetch and affectation lookup | Navigating past and future workday schedules |
| **F8** | Quick Glance Horizontal Row | R3 | 3 glance pills: assigned chantier, logged hours, unread chat | Zero chantiers assigned fallback, 0h logged state, 0 unread badge | Dynamic updates reflecting recorded pointages and chat state | Morning field quick glance dashboard |
| **F9** | Hero Chantier Card | R3 | Typographic card with status badge, address with map pin, start time | Missing optional fields (null coordinates, null description) | Direct GPS navigation URL construction (`maps.google.com/?q=...`) | Landscaper morning site arrival and route launch |
| **F10** | Daily Hours Circular Gauge | R4 | Horseshoe donut progress ring comparing `heures_totales` to target | 0% progress (0h), 100% progress (7h/7h), >100% overtime overflow | Gauge arc angle math and percentage clamping [0, 100%] | Real-time gauge progression as worker inputs hours |
| **F11** | Declarative Hours Form & Steppers | R4 | Steppers (>= 48x48px) for `heures_totales`, `temps_pause`, `heures_sup` | Step increments (0.25h, 0.5h, 1h), bounds [0h, 24h] | Target hours editing (`isEditingTarget`) and localStorage persistence | Evening time-tracking submission by landscaper |
| **F12** | Real-time Breakdown & Auto-overtime | R4 | Calculation badge (`8h = 7h normales + 1h sup`), auto-overtime | Invariant: `normalHours + heures_sup === heures_totales`, reject sup > total | Auto-overtime adjustment when daily target changes | Dynamic hours breakdown during workday adjustment |
| **F13** | Daily Widget Strip & History | R3, R4 | Weather widget fallback, tasks badge, weekly history summary | Weather API network failure fallback, empty weekly history | Aggregated weekly hours summation | End-of-week worker total hours review |
| **F14** | Planning 3-State Period Toggle | R5 | Period toggle (`Jour \| Semaine \| Mois`) | Empty day schedule, weekend boundaries | Filter synchronization between selected date and timeline items | Weekly schedule review by field landscaper |
| **F15** | Planning Schedule & Presence Card | R5 | Day schedule timeline steps, presence card (`X/Y présents`), notes | 0 workers present, 100% team attendance | Cross-referencing affectations with profile attendance | Daily site briefing and presence check |
| **F16** | Fiche Chantier Typographic Layout | R5 | Clean typographic layout, client name, formatted address, GPS button | Long client addresses, missing contact phone | Navigation link validation, call action `tel:` link formatting | Arriving at job site and launching turn-by-turn navigation |
| **F17** | Fiche Chantier Team & Placeholders | R5 | Assigned team avatar row, document placeholders, chat shortcut | Zero assigned team members, deferred photo upload card placeholder | Team presence linking and chat preview room navigation | Reviewing site technical docs (PDF) on mobile |
| **F18** | Chat Channel Filter Tabs | R6 | Filter tabs (`Tous \| Équipe \| Chantier \| Direction`) | Empty channel category, unread filtering | Tab selection filtering conversation list | Navigating channel categories in field |
| **F19** | Chat Conversation List & Badges | R6 | Conversation rows, snippets, timestamps, Terracotta unread badges | 0 unread count (hide badge or clock icon), high unread counts (>99) | Badge styling compliance with Terracotta accent token | Checking urgent site instructions from team leader |
| **F20** | Chat Preview Room UI | R6 | Forest Green outgoing bubbles, Sand incoming bubbles, static data | Long text messages, multi-bubble timeline | 100% static mock data, zero live Supabase WebSocket channels | Reviewing conversation before real-time activation in Phase 2 |
| **F21** | Secondary Screens Polish | R2 | Unified design system applied to `Equipe.tsx`, `Plus.tsx`, `Chantiers.tsx` | Search filtering with no matches, role filtering | Supervisor vs worker view permissions | Supervisor assigning team members to chantiers |
| **F22** | Non-Regression & Quality Assurance | R6 | Supabase auth, Dexie offline cache, RLS policies, passing tests | Corrupt offline cache recovery, network disconnection/reconnection | Idempotent upsert on `[profile_id+date]`, zero duplicate rows | Full offline day: log hours offline -> reconnect -> sync |
| **F23** | Strict Legacy Code Removal | R4 | Absence of `PointageType`, `geolocation.ts`, `'arrivee'`, `'depart'` | Case-insensitive keyword scanning across all pages and modules | SQL migration drops legacy tables with cascade | Verification of 100% declarative time-tracking |

---

## 3. Test Suite Architecture

### File Layout (`src/__tests__/`)
- `src/__tests__/pointages.test.ts`: Existing unit & integration tests (35 tests covering declarative math, Dexie schema v2, legacy removal).
- `src/__tests__/e2e_design_system.test.ts`: Tiers 1-4 tests for R1 & R2 design system, theme tokens, WCAG AA contrast ratios, touch targets, and outdoor ergonomics.
- `src/__tests__/e2e_navigation.test.ts`: Tiers 1-4 tests for R2 persistent 5-tab navigation, active indicators, unread badges, safe-area insets, and AppLayout shell.
- `src/__tests__/e2e_hours_declarative.test.ts`: Tiers 1-4 tests for R4 declarative time-tracking, circular gauge math, steppers, validation bounds, auto-overtime, and Dexie v2 upsert.
- `src/__tests__/e2e_workflows.test.ts`: Tiers 1-4 tests for R3, R5, R6, and cross-feature real-world field landscaper workflows (login -> dashboard -> time-tracking -> planning -> chat).

### Execution Command
```bash
npm test
# Equivalent to: node --test
```
