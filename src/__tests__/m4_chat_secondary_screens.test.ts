import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

describe('Milestone 4: Chat UI & Secondary Screens Polish (R6 & R2)', () => {
  const chatPreviewPath = resolve(projectRoot, 'src/pages/ChatPreview.tsx');
  const chatRoomViewPath = resolve(projectRoot, 'src/components/modules/ChatRoomView.tsx');
  const chatTypesPath = resolve(projectRoot, 'src/types/chat.ts');
  const equipePath = resolve(projectRoot, 'src/pages/Equipe.tsx');
  const plusPath = resolve(projectRoot, 'src/pages/Plus.tsx');
  const chantiersPath = resolve(projectRoot, 'src/pages/Chantiers.tsx');

  const chatPreviewContent = readFileSync(chatPreviewPath, 'utf-8');
  const chatRoomViewContent = readFileSync(chatRoomViewPath, 'utf-8');
  const chatTypesContent = readFileSync(chatTypesPath, 'utf-8');
  const equipeContent = readFileSync(equipePath, 'utf-8');
  const plusContent = readFileSync(plusPath, 'utf-8');
  const chantiersContent = readFileSync(chantiersPath, 'utf-8');

  describe('Tier 1: Feature Coverage — Chat UI Redesign (R6)', () => {
    it('declares static chat types with channel categories and message models', () => {
      assert.ok(existsSync(chatTypesPath), 'src/types/chat.ts must exist');
      assert.match(
        chatTypesContent,
        /ChannelCategory\s*=\s*['"]equipe['"]\s*\|\s*['"]chantier['"]\s*\|\s*['"]direction['"]/,
        'chat.ts must define ChannelCategory with equipe, chantier, direction'
      );
      assert.match(chatTypesContent, /ChatMessage/, 'chat.ts must define ChatMessage');
      assert.match(chatTypesContent, /ChatConversation/, 'chat.ts must define ChatConversation');
    });

    it('implements channel filter tabs for Tous, Équipe, Chantier, and Direction', () => {
      assert.match(chatPreviewContent, /FILTER_TABS/, 'ChatPreview must declare FILTER_TABS');
      assert.match(chatPreviewContent, /Tous/, 'ChatPreview must include Tous filter tab');
      assert.match(chatPreviewContent, /Équipe/, 'ChatPreview must include Équipe filter tab');
      assert.match(chatPreviewContent, /Chantier/, 'ChatPreview must include Chantier filter tab');
      assert.match(chatPreviewContent, /Direction/, 'ChatPreview must include Direction filter tab');
    });

    it('renders Accent Terracotta unread counter badges with exact design specification', () => {
      assert.match(
        chatPreviewContent,
        /bg-terracotta text-white text-\[11px\] font-bold px-2 py-0\.5 rounded-full/,
        'Unread badges must strictly match the exact Terracotta pill specification'
      );
    });

    it('provides ergonomic channel search input with outdoor touch target', () => {
      assert.match(
        chatPreviewContent,
        /min-h-\[48px\]/,
        'Search input in ChatPreview must enforce min 48px height'
      );
      assert.match(
        chatPreviewContent,
        /placeholder="Rechercher une conversation ou un chantier\.\.\."/,
        'Search input must have descriptive placeholder'
      );
    });

    it('renders interactive preview room with Forest Green and Warm Sand bubbles', () => {
      assert.ok(existsSync(chatRoomViewPath), 'ChatRoomView component must exist');

      // Outgoing bubble: Forest Green
      assert.match(
        chatRoomViewContent,
        /bg-foret text-blanc rounded-2xl rounded-tr-xs shadow-xs/,
        'Outgoing message bubble must match exact Forest Green specification'
      );

      // Incoming bubble: Warm Light Sand
      assert.match(
        chatRoomViewContent,
        /bg-sable\/80 text-foret rounded-2xl rounded-tl-xs border border-sable/,
        'Incoming message bubble must match exact Warm Sand specification'
      );
    });

    it('provides minimum 48x48px hit area on Chat preview room Back button', () => {
      assert.match(
        chatRoomViewContent,
        /min-w-\[48px\]\s+min-h-\[48px\]/,
        'Back button in Chat preview room must enforce minimum 48x48px touch target'
      );
    });

    it('provides ergonomic input form with minimum 48px send button and text box', () => {
      assert.match(
        chatRoomViewContent,
        /<input[\s\S]*?min-h-\[48px\]/,
        'Chat input field must satisfy min 48px height'
      );
      assert.match(
        chatRoomViewContent,
        /<button[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
        'Send button in Chat room must satisfy min 48x48px touch target'
      );
    });

    it('guarantees 100% static mock purity without live Supabase Realtime subscriptions', () => {
      assert.doesNotMatch(
        chatPreviewContent,
        /supabase\.channel|supabase\.from\(['"]messages['"]\)\.on/i,
        'ChatPreview must NOT open live Supabase Realtime WebSocket subscriptions'
      );
      assert.doesNotMatch(
        chatRoomViewContent,
        /supabase\.channel|supabase\.from\(['"]messages['"]\)\.on/i,
        'ChatRoomView must NOT open live Supabase Realtime WebSocket subscriptions'
      );
    });
  });

  describe('Tier 2: Feature Coverage — Secondary Screens Polish (R2)', () => {
    describe('Équipe Screen (Equipe.tsx)', () => {
      it('applies biophilic styling with organic rounded borders and soft shadows', () => {
        assert.match(equipeContent, /text-foret/, 'Équipe must use text-foret');
        assert.match(equipeContent, /rounded-2xl sm:rounded-3xl/, 'Cards must use rounded-2xl/3xl');
        assert.match(equipeContent, /shadow-soft/, 'Cards must use soft diffuse shadows');
      });

      it('enforces minimum 48px touch targets on search and role filter tabs', () => {
        assert.match(
          equipeContent,
          /<input[\s\S]*?min-h-\[48px\]/,
          'Search input must enforce min 48px height'
        );
        assert.match(
          equipeContent,
          /min-h-\[48px\]\s+px-4\s+rounded-2xl/,
          'Filter tabs must enforce min 48px height'
        );
      });

      it('enforces minimum 48x48px touch targets for direct phone and SMS quick actions', () => {
        assert.match(
          equipeContent,
          /href=\{`tel:\$\{member\.telephone\}`\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
          'Call action button must have min 48x48px hit area'
        );
        assert.match(
          equipeContent,
          /href=\{`sms:\$\{member\.telephone\}`\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
          'SMS action button must have min 48x48px hit area'
        );
      });

      it('guarantees high contrast role badges compliant with WCAG AA', () => {
        assert.match(equipeContent, /text-amber-950/, 'Chef d equipe badge must use high contrast text');
        assert.match(equipeContent, /text-indigo-950/, 'Admin badge must use high contrast text');
        assert.match(equipeContent, /text-emerald-950/, 'Ouvrier badge must use high contrast text');
      });
    });

    describe('Plus Screen (Plus.tsx)', () => {
      it('applies brand design tokens across profile and diagnostic cards', () => {
        assert.match(plusContent, /text-foret/, 'Plus must use text-foret');
        assert.match(plusContent, /rounded-2xl sm:rounded-3xl/, 'Cards must use rounded-2xl/3xl');
        assert.match(plusContent, /shadow-soft/, 'Cards must use shadow-soft');
      });

      it('enforces minimum 48px touch targets on all interactive buttons', () => {
        assert.match(
          plusContent,
          /onClick=\{handleSyncNow\}[\s\S]*?min-h-\[48px\]/,
          'Force sync button must have min-h-[48px]'
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

    describe('Chantiers Screen (Chantiers.tsx)', () => {
      it('applies brand design tokens across header and site cards', () => {
        assert.match(chantiersContent, /text-foret/, 'Chantiers must use text-foret');
        assert.match(chantiersContent, /rounded-2xl sm:rounded-3xl/, 'Cards must use rounded-2xl/3xl');
        assert.match(chantiersContent, /shadow-soft/, 'Cards must use shadow-soft');
      });

      it('enforces minimum 48px touch targets on primary actions, search and filters', () => {
        assert.match(
          chantiersContent,
          /onClick=\{\(\) => setIsCreateModalOpen\(true\)\}[\s\S]*?min-h-\[48px\]/,
          'Create chantier button must have min-h-[48px]'
        );
        assert.match(
          chantiersContent,
          /<input[\s\S]*?min-h-\[48px\]/,
          'Search input in Chantiers must have min-h-[48px]'
        );
        assert.match(
          chantiersContent,
          /statusFilter === tab\.key[\s\S]*?min-h-\[48px\]/,
          'Status filter tabs must have min-h-[48px]'
        );
      });

      it('enforces minimum 48px touch targets on card quick actions (Modifier, Affecter, Détails)', () => {
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
      });

      it('enforces minimum 48px touch targets on address GPS link', () => {
        assert.match(
          chantiersContent,
          /href=\{`https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}`\}[\s\S]*?min-h-\[48px\]/,
          'GPS navigation link must have min-h-[48px]'
        );
      });

      it('enforces minimum 48x48px touch targets on modal close buttons and form controls', () => {
        assert.match(
          chantiersContent,
          /onClick=\{\(\) => setIsCreateModalOpen\(false\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
          'Modal close button must have min 48x48px hit area'
        );
        assert.match(
          chantiersContent,
          /onClick=\{\(\) => setEditingChantier\(null\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
          'Edit modal close button must have min 48x48px hit area'
        );
        assert.match(
          chantiersContent,
          /onClick=\{\(\) => setAssigningChantier\(null\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/,
          'Assign modal close button must have min 48x48px hit area'
        );
      });
    });
  });

  describe('Tier 3: Cross-Feature Interactions — Mock State Transitions & Deep Linking', () => {
    it('supports deep linking to site chat channel via search params', () => {
      assert.match(
        chatPreviewContent,
        /searchParams\.get\(['"]channel['"]\)\s*\|\|\s*searchParams\.get\(['"]chantier['"]\)/,
        'ChatPreview must read channel or chantier query param'
      );
    });

    it('clears unread badge counter when user selects conversation', () => {
      assert.match(
        chatPreviewContent,
        /c\.id === id \? \{ \.\.\.c, unreadCount: 0 \} : c/,
        'Selecting a channel must clear its unread badge count'
      );
    });

    it('appends user outgoing messages to conversation thread', () => {
      assert.match(
        chatPreviewContent,
        /messages:\s*\[\.\.\.ch\.messages,\s*newMsg\]/,
        'Sending message must append to local messages array'
      );
      assert.match(
        chatPreviewContent,
        /isOutgoing:\s*true/,
        'New message must be marked as isOutgoing: true'
      );
    });
  });
});
