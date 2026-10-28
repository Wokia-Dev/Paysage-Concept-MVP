/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Milestone 4 Empirical Adversarial Stress Harness (Challenger 2)', () => {
  const equipePath = resolve(projectRoot, 'src/pages/Equipe.tsx');
  const plusPath = resolve(projectRoot, 'src/pages/Plus.tsx');
  const chantiersPath = resolve(projectRoot, 'src/pages/Chantiers.tsx');
  const chatPreviewPath = resolve(projectRoot, 'src/pages/ChatPreview.tsx');
  const chatRoomViewPath = resolve(projectRoot, 'src/components/modules/ChatRoomView.tsx');
  const chatTypesPath = resolve(projectRoot, 'src/types/chat.ts');
  const dbPath = resolve(projectRoot, 'src/lib/db.ts');
  const syncPath = resolve(projectRoot, 'src/lib/sync.ts');
  const authContextPath = resolve(projectRoot, 'src/context/AuthContext.tsx');
  const migrationPath = resolve(
    projectRoot,
    'supabase/migrations/20261028_refactor_pointages_declaratif.sql'
  );

  const equipeContent = readFileSync(equipePath, 'utf-8');
  const plusContent = readFileSync(plusPath, 'utf-8');
  const chantiersContent = readFileSync(chantiersPath, 'utf-8');
  const chatPreviewContent = readFileSync(chatPreviewPath, 'utf-8');
  const chatRoomViewContent = readFileSync(chatRoomViewPath, 'utf-8');
  const dbContent = readFileSync(dbPath, 'utf-8');
  const syncContent = readFileSync(syncPath, 'utf-8');
  const authContextContent = readFileSync(authContextPath, 'utf-8');
  const migrationContent = readFileSync(migrationPath, 'utf-8');

  // =========================================================================
  // Dimension 1: Supabase Backend Operations, Dexie Offline Caching & RLS
  // =========================================================================
  describe('Dimension 1: Supabase Backend Operations, Dexie Offline & Caching Non-Regression', () => {
    it('verifies Dexie v2 schema includes [profile_id+date] compound index', () => {
      assert.match(
        dbContent,
        /version\(2\)\s*\.stores\(\s*\{[\s\S]*?pointages:\s*['"][^'"]*\[profile_id\+date\][^'"]*['"]/,
        'Dexie v2 must define compound index [profile_id+date]'
      );
    });

    it('verifies syncEngine saveDailyPointage enforces idempotence and retains ID on update', () => {
      assert.match(
        syncContent,
        /saveDailyPointage[\s\S]*?\.where\(['"]\[profile_id\+date\]['"]\)[\s\S]*?\.equals\(\[data\.profile_id,\s*data\.date\]\)/,
        'saveDailyPointage must query Dexie via compound index [profile_id+date]'
      );
      assert.match(
        syncContent,
        /pointageId\s*=\s*existing\s*\?\s*existing\.id\s*:\s*generateUUID\(\)/,
        'saveDailyPointage must reuse existing ID during updates to prevent duplicates'
      );
    });

    it('verifies syncEngine pushes pointages to Supabase via UPSERT with onConflict (profile_id, date)', () => {
      assert.match(
        syncContent,
        /supabase\s*\.from\(['"]pointages['"]\)\s*\.upsert\([\s\S]*?\{\s*onConflict:\s*['"]profile_id,date['"]\s*\}\)/,
        'Supabase push must use upsert with onConflict profile_id,date'
      );
    });

    it('verifies Supabase SQL migration declares strict RLS policies on pointages', () => {
      assert.match(
        migrationContent,
        /ALTER TABLE public\.pointages ENABLE ROW LEVEL SECURITY;/,
        'RLS must be enabled on pointages'
      );
      assert.match(
        migrationContent,
        /CREATE POLICY "pointages_select_policy"\s+ON public\.pointages FOR SELECT\s+TO authenticated\s+USING \(true\);/,
        'SELECT policy must allow authenticated users'
      );
      assert.match(
        migrationContent,
        /CREATE POLICY "pointages_insert_policy"[\s\S]*?auth\.uid\(\) = profile_id[\s\S]*?role IN \('chef_equipe', 'admin'\)/,
        'INSERT policy must restrict to own profile or supervisor roles'
      );
      assert.match(
        migrationContent,
        /CREATE POLICY "pointages_update_policy"[\s\S]*?auth\.uid\(\) = profile_id[\s\S]*?role IN \('chef_equipe', 'admin'\)/,
        'UPDATE policy must restrict to own profile or supervisor roles'
      );
      assert.match(
        migrationContent,
        /CREATE POLICY "pointages_delete_policy"[\s\S]*?auth\.uid\(\) = profile_id[\s\S]*?role IN \('chef_equipe', 'admin'\)/,
        'DELETE policy must restrict to own profile or supervisor roles'
      );
    });

    it('verifies table constraints enforce valid hours range and profile-date uniqueness in SQL migration', () => {
      assert.match(
        migrationContent,
        /CONSTRAINT pointages_heures_totales_positive CHECK \(heures_totales >= 0 AND heures_totales <= 24\)/,
        'SQL migration must enforce heures_totales between 0 and 24'
      );
      assert.match(
        migrationContent,
        /CONSTRAINT pointages_heures_sup_le_totales CHECK \(heures_sup <= heures_totales\)/,
        'SQL migration must enforce heures_sup <= heures_totales'
      );
      assert.match(
        migrationContent,
        /CONSTRAINT pointages_profile_date_unique UNIQUE \(profile_id, date\)/,
        'SQL migration must enforce UNIQUE(profile_id, date)'
      );
    });

    it('verifies AuthContext provides seamless role separation with safe fallback to ouvrier', () => {
      assert.match(
        authContextContent,
        /role:\s*profile\?\.role\s*\?\?\s*['"]ouvrier['"]/,
        'AuthContext must default undefined role to ouvrier'
      );
      assert.match(
        authContextContent,
        /loginDemo[\s\S]*?targetRole:\s*UserRole/,
        'AuthContext must support switching demo roles'
      );
      assert.match(
        authContextContent,
        /logout[\s\S]*?localStorage\.removeItem\(LOCAL_STORAGE_ACTIVE_PROFILE_KEY\)/,
        'Logout must clear active profile from localStorage'
      );
    });
  });

  // =========================================================================
  // Dimension 2: Secondary Screens Polish & Touch Ergonomics
  // =========================================================================
  describe('Dimension 2: Secondary Screens Polish & Touch Ergonomics', () => {
    describe('Equipe.tsx', () => {
      it('implements responsive search filtering across full names with clear button', () => {
        assert.match(
          equipeContent,
          /const fullName = `\$\{p\.prenom\} \$\{p\.nom\}`\.toLowerCase\(\)/,
          'Equipe must filter profiles by combined full name'
        );
        assert.match(
          equipeContent,
          /setSearchQuery\(['"]['"]\)/,
          'Equipe must have clear button to reset search'
        );
        assert.match(
          equipeContent,
          /aria-label="Effacer la recherche"/,
          'Clear search button must have accessible aria-label'
        );
      });

      it('displays WCAG AA compliant role badges with distinct icons and colors', () => {
        assert.match(
          equipeContent,
          /case 'chef_equipe':[\s\S]*?text-amber-950/,
          'Chef d equipe badge must use high contrast amber-950'
        );
        assert.match(
          equipeContent,
          /case 'admin':[\s\S]*?text-indigo-950/,
          'Admin badge must use high contrast indigo-950'
        );
        assert.match(
          equipeContent,
          /default:[\s\S]*?text-emerald-950/,
          'Ouvrier badge must use high contrast emerald-950'
        );
      });

      it('renders ergonomic direct phone and SMS quick actions with min 48x48px hit areas', () => {
        assert.match(
          equipeContent,
          /href=\{`tel:\$\{member\.telephone\}`\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/,
          'Phone link must satisfy 48x48px touch target'
        );
        assert.match(
          equipeContent,
          /href=\{`sms:\$\{member\.telephone\}`\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/,
          'SMS link must satisfy 48x48px touch target'
        );
      });

      it('renders today assigned chantier or fallback when member has no assignment', () => {
        assert.match(
          equipeContent,
          /getTodayChantierForMember/,
          'Equipe must look up today assigned chantier'
        );
        assert.match(
          equipeContent,
          /Aucun chantier affecté ce jour/,
          'Equipe must handle unassigned members gracefully'
        );
      });
    });

    describe('Plus.tsx', () => {
      it('displays Dexie IndexedDB cache diagnostic counters and subscribes to syncEngine updates', () => {
        assert.match(
          plusContent,
          /db\.pointages\.count\(\)/,
          'Plus must count local pointages in Dexie'
        );
        assert.match(
          plusContent,
          /db\.pointages\.filter\(\(pt\)\s*=>\s*!pt\.synced\)\.count\(\)/,
          'Plus must count unsynced pointages in Dexie'
        );
        assert.match(
          plusContent,
          /syncEngine\.subscribe\(fetchStats\)/,
          'Plus must subscribe to syncEngine events for real-time reactivity'
        );
      });

      it('disables Force Sync button when offline and informs user', () => {
        assert.match(
          plusContent,
          /disabled=\{!isOnline \|\| isSyncing\}/,
          'Sync button must be disabled when offline or already syncing'
        );
        assert.match(
          plusContent,
          /Impossible : vous êtes actuellement hors-ligne\./,
          'Plus must warn when attempting sync while offline'
        );
      });

      it('enforces minimum 48px touch targets on Force Sync, Reset Demo Data, and Logout', () => {
        assert.match(
          plusContent,
          /onClick=\{handleSyncNow\}[\s\S]*?min-h-\[48px\]/,
          'Sync button must have min-h-[48px]'
        );
        assert.match(
          plusContent,
          /onClick=\{handleResetDemoData\}[\s\S]*?min-h-\[48px\]/,
          'Reset demo data button must have min-h-[48px]'
        );
        assert.match(
          plusContent,
          /onClick=\{handleLogout\}[\s\S]*?min-h-\[48px\]/,
          'Logout button must have min-h-[48px]'
        );
      });
    });

    describe('Chantiers.tsx', () => {
      it('supports instant multi-field search across client, address, and description', () => {
        assert.match(
          chantiersContent,
          /c\.nom_client\.toLowerCase\(\)\.includes\(searchQuery\.toLowerCase\(\)\) \|\|[\s\S]*?c\.adresse\.toLowerCase\(\)\.includes\(searchQuery\.toLowerCase\(\)\) \|\|[\s\S]*?c\.description/,
          'Chantiers search must match client name, address, or description'
        );
      });

      it('enforces minimum 48px touch targets on search, status filter tabs, and new chantier button', () => {
        assert.match(
          chantiersContent,
          /onClick=\{\(\) => setIsCreateModalOpen\(true\)\}[\s\S]*?min-h-\[48px\]/,
          'Create chantier button must have min-h-[48px]'
        );
        assert.match(
          chantiersContent,
          /<input[\s\S]*?min-h-\[48px\]/,
          'Search input must have min-h-[48px]'
        );
        assert.match(
          chantiersContent,
          /statusFilter === tab\.key[\s\S]*?min-h-\[48px\]/,
          'Status filter buttons must have min-h-[48px]'
        );
      });

      it('enforces minimum 48px touch targets on card actions (Modifier, Affecter, Détails) and GPS link', () => {
        assert.match(
          chantiersContent,
          /onClick=\{\(\) => handleOpenEdit\(chantier\)\}[\s\S]*?min-h-\[48px\]/,
          'Modifier button must have min-h-[48px]'
        );
        assert.match(
          chantiersContent,
          /onClick=\{\(\) => \{[\s\S]*?setAssigningChantier\(chantier\)[\s\S]*?min-h-\[48px\]/,
          'Affecter button must have min-h-[48px]'
        );
        assert.match(
          chantiersContent,
          /<Link[\s\S]*?to=\{`\/chantier\/\$\{chantier\.id\}`\}[\s\S]*?min-h-\[48px\]/,
          'Details link must have min-h-[48px]'
        );
        assert.match(
          chantiersContent,
          /href=\{`https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}`\}[\s\S]*?min-h-\[48px\]/,
          'GPS link must have min-h-[48px]'
        );
      });
    });
  });

  // =========================================================================
  // Dimension 3: Modal Workflows & Edge-Case Robustness
  // =========================================================================
  describe('Dimension 3: Modal Workflows & Edge-Case Robustness', () => {
    it('validates required fields before creating a chantier in Chantiers.tsx', () => {
      assert.match(
        chantiersContent,
        /if \(!createForm\.nom_client\.trim\(\) \|\| !createForm\.adresse\.trim\(\)\)/,
        'Chantier creation must reject whitespace-only or empty client/address'
      );
      assert.match(
        chantiersContent,
        /db\.chantiers\.put\(newChantier\)/,
        'Chantier creation must immediately persist to local Dexie'
      );
    });

    it('updates Dexie immediately and Supabase conditionally on online in handleUpdateChantier', () => {
      assert.match(
        chantiersContent,
        /await db\.chantiers\.update\(editingChantier\.id, updatedData\)/,
        'Chantier update must immediately persist to local Dexie'
      );
      assert.match(
        chantiersContent,
        /if \(navigator\.onLine\)[\s\S]*?await supabase\s*\.from\(['"]chantiers['"]\)\s*\.update/,
        'Chantier update must synchronize to Supabase when online'
      );
    });

    it('implements date-scoped worker assignment toggle in Chantiers.tsx', () => {
      assert.match(
        chantiersContent,
        /handleToggleWorker/,
        'Chantiers must declare handleToggleWorker'
      );
      assert.match(
        chantiersContent,
        /a\.chantier_id === assigningChantier\.id &&\s*a\.profile_id === workerId &&\s*a\.date_intervention === assignDate/,
        'Worker toggle must match chantier, profile, and exact intervention date'
      );
      assert.match(
        chantiersContent,
        /db\.affectations\.delete\(existingAff\.id\)/,
        'Worker toggle must remove existing assignment'
      );
      assert.match(
        chantiersContent,
        /db\.affectations\.put\(newAff\)/,
        'Worker toggle must insert new assignment'
      );
    });

    it('enforces minimum 48x48px hit areas on all modal close buttons and >= 48px on form controls', () => {
      assert.match(
        chantiersContent,
        /onClick=\{\(\) => setIsCreateModalOpen\(false\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/,
        'Create modal close button must enforce 48x48px'
      );
      assert.match(
        chantiersContent,
        /onClick=\{\(\) => setEditingChantier\(null\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/,
        'Edit modal close button must enforce 48x48px'
      );
      assert.match(
        chantiersContent,
        /onClick=\{\(\) => setAssigningChantier\(null\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/,
        'Assign modal close button must enforce 48x48px'
      );
      assert.match(
        chantiersContent,
        /input[\s\S]*?min-h-\[48px\]/,
        'Form inputs in modals must enforce min-h-[48px]'
      );
    });
  });

  // =========================================================================
  // Dimension 4: Chat UI Visual Language & Static Mock Purity (R6)
  // =========================================================================
  describe('Dimension 4: Chat UI Visual Language & Static Mock Purity (R6)', () => {
    it('verifies static chat type definitions file exists on disk', () => {
      assert.ok(existsSync(chatTypesPath), 'src/types/chat.ts must exist on disk');
    });

    it('verifies 100% absence of live Supabase Realtime subscriptions across all chat files', () => {
      assert.doesNotMatch(
        chatPreviewContent,
        /supabase\.channel|supabase\.from\(['"]messages['"]\)\.on/i,
        'ChatPreview must NOT open live Supabase Realtime channels'
      );
      assert.doesNotMatch(
        chatRoomViewContent,
        /supabase\.channel|supabase\.from\(['"]messages['"]\)\.on/i,
        'ChatRoomView must NOT open live Supabase Realtime channels'
      );
    });

    it('verifies exact Accent Terracotta unread badges styling in ChatPreview', () => {
      assert.match(
        chatPreviewContent,
        /bg-terracotta text-white text-\[11px\] font-bold px-2 py-0\.5 rounded-full/,
        'Unread badges in ChatPreview must strictly match the design token specification'
      );
    });

    it('verifies Forest Green outgoing bubbles and Warm Sand incoming bubbles in ChatRoomView', () => {
      assert.match(
        chatRoomViewContent,
        /bg-foret text-blanc rounded-2xl rounded-tr-xs shadow-xs/,
        'Outgoing message bubble must use Forest Green'
      );
      assert.match(
        chatRoomViewContent,
        /bg-sable\/80 text-foret rounded-2xl rounded-tl-xs border border-sable/,
        'Incoming message bubble must use Warm Sand'
      );
    });

    it('supports deep linking from other screens via query parameters channel or chantier', () => {
      assert.match(
        chatPreviewContent,
        /searchParams\.get\(['"]channel['"]\)\s*\|\|\s*searchParams\.get\(['"]chantier['"]\)/,
        'ChatPreview must read channel or chantier query parameter'
      );
      assert.match(
        chatPreviewContent,
        /next\.delete\(['"]channel['"]\);[\s\S]*?next\.delete\(['"]chantier['"]\);/,
        'Back button from room must clean up query parameters'
      );
    });

    it('verifies interactive message dispatch updates local preview room without network dependency', () => {
      assert.match(
        chatPreviewContent,
        /handleSendMessage[\s\S]*?setChannels\(\(prev\) =>[\s\S]*?messages:\s*\[\.\.\.ch\.messages,\s*newMsg\]/,
        'handleSendMessage must append to conversation thread in local state'
      );
    });
  });
});
