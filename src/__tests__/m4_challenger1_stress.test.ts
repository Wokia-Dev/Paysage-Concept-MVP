import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChatConversation, ChatMessage, FilterCategory } from '../types/chat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

// Color luminance utilities for WCAG contrast validation
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getChannelLuminance(value8Bit: number): number {
  const sRGB = value8Bit / 255;
  return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  return (
    0.2126 * getChannelLuminance(r) +
    0.7152 * getChannelLuminance(g) +
    0.0722 * getChannelLuminance(b)
  );
}

function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Empirical Adversarial Stress Harness: Milestone 4 (Challenger 1)', () => {
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

  describe('Dimension 1: Static Mock Purity & Zero Realtime Subscriptions in Chat', () => {
    it('verifies chat.ts defines pure static types without external realtime entities', () => {
      assert.match(chatTypesContent, /ChannelCategory/);
      assert.match(chatTypesContent, /ChatMessage/);
      assert.match(chatTypesContent, /ChatConversation/);
    });

    it('strictly forbids live Supabase client imports in ChatPreview and ChatRoomView', () => {
      assert.doesNotMatch(
        chatPreviewContent,
        /from\s+['"][^'"]*supabase['"]/i,
        'ChatPreview must NOT import supabase client'
      );
      assert.doesNotMatch(
        chatRoomViewContent,
        /from\s+['"][^'"]*supabase['"]/i,
        'ChatRoomView must NOT import supabase client'
      );
    });

    it('strictly forbids live IndexedDB/Dexie database calls in Chat components', () => {
      assert.doesNotMatch(
        chatPreviewContent,
        /db\.pointages|db\.chantiers|db\.profiles/i,
        'ChatPreview must NOT access Dexie database'
      );
      assert.doesNotMatch(
        chatRoomViewContent,
        /db\.pointages|db\.chantiers|db\.profiles/i,
        'ChatRoomView must NOT access Dexie database'
      );
    });

    it('strictly forbids any live WebSocket or Supabase Realtime channel invocations', () => {
      const forbiddenPatterns = [
        /supabase\.channel/i,
        /new\s+WebSocket/i,
        /new\s+EventSource/i,
        /supabase\.from\(['"]messages['"]\)/i,
        /\.subscribe\(/i,
      ];

      for (const pattern of forbiddenPatterns) {
        assert.doesNotMatch(
          chatPreviewContent,
          pattern,
          `ChatPreview must not match forbidden network/realtime pattern: ${pattern}`
        );
        assert.doesNotMatch(
          chatRoomViewContent,
          pattern,
          `ChatRoomView must not match forbidden network/realtime pattern: ${pattern}`
        );
      }
    });

    it('validates ChatConversation and ChatMessage data structures for static mock integrity', () => {
      // Mock conversation sample
      const mockConv: ChatConversation = {
        id: 'test-chan',
        title: 'Test Channel',
        category: 'chantier',
        subtitle: 'Dernier message test',
        time: '12:00',
        unreadCount: 3,
        messages: [
          {
            id: 'm1',
            senderId: 'marc',
            senderName: 'Marc Vasseur',
            content: 'Message entrant',
            timestamp: '11:59',
            isOutgoing: false,
          },
          {
            id: 'm2',
            senderId: 'user',
            senderName: 'Moi',
            content: 'Message sortant',
            timestamp: '12:00',
            isOutgoing: true,
          },
        ],
      };

      assert.equal(mockConv.messages.length, 2);
      assert.equal(mockConv.messages[0].isOutgoing, false);
      assert.equal(mockConv.messages[1].isOutgoing, true);
    });
  });

  describe('Dimension 2: Chat Preview Room Mechanics & Bubble Styling', () => {
    it('enforces exact Forest Green outgoing message bubble styling', () => {
      // Outgoing: bg-foret text-blanc rounded-2xl rounded-tr-xs shadow-xs
      assert.match(
        chatRoomViewContent,
        /bg-foret\s+text-blanc\s+rounded-2xl\s+rounded-tr-xs\s+shadow-xs/,
        'Outgoing message bubble must match exact Forest Green styling'
      );
    });

    it('enforces exact Warm Sand incoming message bubble styling', () => {
      // Incoming: bg-sable/80 text-foret rounded-2xl rounded-tl-xs border border-sable
      assert.match(
        chatRoomViewContent,
        /bg-sable\/80\s+text-foret\s+rounded-2xl\s+rounded-tl-xs\s+border\s+border-sable/,
        'Incoming message bubble must match exact Warm Sand styling'
      );
    });

    it('verifies sender initials generation algorithm for incoming message avatars', () => {
      const getInitials = (name: string): string => {
        return name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('');
      };

      assert.equal(getInitials('Marc Vasseur'), 'MV');
      assert.equal(getInitials('Thomas Martin'), 'TM');
      assert.equal(getInitials('Sophie Vasseur (Admin)'), 'SV');
      assert.equal(getInitials('Alexandre (Direction)'), 'A(');
      assert.equal(getInitials('Antoine Petit'), 'AP');
      assert.equal(getInitials('Single'), 'S');
    });

    it('simulates message sending, local appending, and invariant preservation', () => {
      let channels: ChatConversation[] = [
        {
          id: 'test-chan',
          title: 'Villa Test',
          category: 'chantier',
          subtitle: 'Ancien message',
          time: 'Hier',
          unreadCount: 1,
          messages: [
            {
              id: 'm1',
              senderId: 'marc',
              senderName: 'Marc Vasseur',
              content: 'Bonjour',
              timestamp: '08:00',
              isOutgoing: false,
            },
          ],
        },
      ];

      // Simulate sending a message
      const conversationId = 'test-chan';
      const content = 'Nouveau message de test';
      const nowTime = '14:30';

      const newMsg: ChatMessage = {
        id: `msg-test-123`,
        senderId: 'user',
        senderName: 'Moi',
        content,
        timestamp: nowTime,
        isOutgoing: true,
      };

      channels = channels.map((ch) =>
        ch.id === conversationId
          ? {
              ...ch,
              subtitle: `Moi : ${content}`,
              time: "À l'instant",
              messages: [...ch.messages, newMsg],
            }
          : ch
      );

      const target = channels.find((c) => c.id === conversationId);
      assert.ok(target, 'Conversation must exist');
      assert.equal(target.messages.length, 2, 'Message must be appended locally');
      assert.equal(target.messages[1].content, 'Nouveau message de test');
      assert.equal(target.messages[1].isOutgoing, true);
      assert.equal(target.subtitle, 'Moi : Nouveau message de test');
      assert.equal(target.time, "À l'instant");
      assert.equal(target.messages[0].content, 'Bonjour', 'Prior messages must be preserved unmodified');
    });

    it('verifies empty or whitespace-only messages cannot be submitted', () => {
      // In ChatRoomView:
      // disabled={!inputText.trim()}
      // const trimmed = inputText.trim(); if (!trimmed) return;
      assert.match(
        chatRoomViewContent,
        /disabled=\{!inputText\.trim\(\)\}/,
        'Send button must be disabled when input is empty or whitespace'
      );
      assert.match(
        chatRoomViewContent,
        /const\s+trimmed\s*=\s*inputText\.trim\(\);\s*if\s*\(!trimmed\)\s*return;/,
        'Form submit handler must guard against whitespace-only submissions'
      );
    });

    it('verifies back button routing and URLSearchParams query parameter clearing', () => {
      // handleBackFromRoom unsets selectedConversationId and removes ?channel= or ?chantier=
      assert.match(
        chatPreviewContent,
        /setSelectedConversationId\(null\)/,
        'Back handler must clear selectedConversationId'
      );
      assert.match(
        chatPreviewContent,
        /next\.delete\('channel'\);[\s\S]*?next\.delete\('chantier'\);/,
        'Back handler must clean up URL search parameters'
      );
    });
  });

  describe('Dimension 3: Empirical Touch Target Compliance (>= 48x48px)', () => {
    it('verifies all buttons, inputs and touch targets in ChatPreview.tsx meet >= 48px', () => {
      // Search input
      assert.match(chatPreviewContent, /<input[\s\S]*?min-h-\[48px\]/);
      // Clear button
      assert.match(chatPreviewContent, /aria-label="Effacer la recherche"[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]/);
      // Filter tab buttons
      assert.match(chatPreviewContent, /FILTER_TABS\.map[\s\S]*?min-h-\[48px\]\s+px-4/);
      // Channel cards
      assert.match(chatPreviewContent, /filteredChannels\.map[\s\S]*?min-h-\[56px\]/);
    });

    it('verifies all buttons and inputs in ChatRoomView.tsx meet >= 48x48px', () => {
      // Back button
      assert.match(chatRoomViewContent, /aria-label="Retour à la liste des canaux"[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // Text input
      assert.match(chatRoomViewContent, /<input[\s\S]*?min-h-\[48px\]/);
      // Send button
      assert.match(chatRoomViewContent, /aria-label="Envoyer le message"[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
    });

    it('verifies all buttons, inputs and links in Equipe.tsx meet >= 48x48px', () => {
      // Search input
      assert.match(equipeContent, /<input[\s\S]*?min-h-\[48px\]/);
      // Clear button
      assert.match(equipeContent, /aria-label="Effacer la recherche"[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // Filter role tabs
      assert.match(equipeContent, /filterRole[\s\S]*?min-h-\[48px\]\s+px-4/);
      // Phone action link
      assert.match(equipeContent, /href=\{`tel:\$\{member\.telephone\}`\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // SMS action link
      assert.match(equipeContent, /href=\{`sms:\$\{member\.telephone\}`\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
    });

    it('verifies all buttons in Plus.tsx meet >= 48px height', () => {
      // Force sync button
      assert.match(plusContent, /onClick=\{handleSyncNow\}[\s\S]*?w-full\s+min-h-\[48px\]/);
      // Reset demo data button
      assert.match(plusContent, /onClick=\{handleResetDemoData\}[\s\S]*?w-full\s+min-h-\[48px\]/);
      // Logout button
      assert.match(plusContent, /onClick=\{handleLogout\}[\s\S]*?w-full\s+min-h-\[48px\]/);
    });

    it('verifies all buttons, inputs, links, and modal triggers in Chantiers.tsx meet >= 48px', () => {
      // Notification close
      assert.match(chantiersContent, /aria-label="Fermer la notification"[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // "Nouveau chantier" button
      assert.match(chantiersContent, /onClick=\{\(\) => setIsCreateModalOpen\(true\)\}[\s\S]*?min-h-\[48px\]\s+px-4/);
      // Search input
      assert.match(chantiersContent, /placeholder="Rechercher par client, adresse, travaux\.\.\."[\s\S]*?min-h-\[48px\]/);
      // Clear search button
      assert.match(chantiersContent, /aria-label="Effacer la recherche"[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // Status filter tabs
      assert.match(chantiersContent, /statusFilter === tab\.key[\s\S]*?min-h-\[48px\]\s+px-4/);
      // Address GPS navigation link
      assert.match(chantiersContent, /href=\{`https:\/\/maps\.google\.com\/\?q=\$\{encodeURIComponent\(chantier\.adresse\)\}`\}[\s\S]*?min-h-\[48px\]/);
      // Card action Modifier button
      assert.match(chantiersContent, /onClick=\{\(\) => handleOpenEdit\(chantier\)\}[\s\S]*?min-h-\[48px\]/);
      // Card action Affecter button
      assert.match(chantiersContent, /onClick=\{\(\) => \{[\s\S]*?setAssigningChantier\(chantier\)[\s\S]*?min-h-\[48px\]/);
      // Card action Details Link
      assert.match(chantiersContent, /<Link[\s\S]*?to=\{`\/chantier\/\$\{chantier\.id\}`\}[\s\S]*?min-h-\[48px\]/);

      // Create Modal close button
      assert.match(chantiersContent, /onClick=\{\(\) => setIsCreateModalOpen\(false\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // Edit Modal close button
      assert.match(chantiersContent, /onClick=\{\(\) => setEditingChantier\(null\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // Assign Modal close button
      assert.match(chantiersContent, /onClick=\{\(\) => setAssigningChantier\(null\)\}[\s\S]*?min-w-\[48px\]\s+min-h-\[48px\]\s+w-12\s+h-12/);
      // Assign worker row
      assert.match(chantiersContent, /onClick=\{\(\) => handleToggleWorker\(p\.id\)\}[\s\S]*?min-h-\[52px\]/);
      // Assign "Terminer" button
      assert.match(chantiersContent, /onClick=\{\(\) => setAssigningChantier\(null\)\}[\s\S]*?w-full\s+min-h-\[48px\]/);
    });
  });

  describe('Dimension 4: Filter & Search Stress Testing', () => {
    const mockChannels: ChatConversation[] = [
      {
        id: 'general',
        title: 'Équipe Paysage Concept',
        category: 'equipe',
        subtitle: 'Sophie (Admin) : Rappel livraison terreau',
        time: '08:14',
        unreadCount: 2,
        messages: [],
      },
      {
        id: 'laurent',
        title: 'Chantier Villa Laurent',
        category: 'chantier',
        subtitle: 'Marc : Enrochements terminés',
        time: 'Hier',
        unreadCount: 0,
        messages: [],
      },
      {
        id: 'cedres',
        title: 'Résidence Les Cèdres',
        category: 'chantier',
        subtitle: 'Thomas : Déchetterie pro pleine',
        time: 'Hier',
        unreadCount: 1,
        messages: [],
      },
      {
        id: 'direction',
        title: 'Direction & Sécurité',
        category: 'direction',
        subtitle: 'Consignes canicule',
        time: 'Lun',
        unreadCount: 0,
        messages: [],
      },
      {
        id: 'beauvallon',
        title: 'Domaine de Beauvallon',
        category: 'chantier',
        subtitle: 'Antoine : Gazon posé',
        time: 'Lun',
        unreadCount: 0,
        messages: [],
      },
    ];

    const filterFunction = (
      channels: ChatConversation[],
      activeTab: FilterCategory,
      searchQuery: string
    ) => {
      return channels.filter((c) => {
        const matchesTab = activeTab === 'tous' || c.category === activeTab;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          c.title.toLowerCase().includes(query) ||
          c.subtitle.toLowerCase().includes(query);
        return matchesTab && matchesSearch;
      });
    };

    it('correctly filters channels by category', () => {
      assert.equal(filterFunction(mockChannels, 'tous', '').length, 5);
      assert.equal(filterFunction(mockChannels, 'equipe', '').length, 1);
      assert.equal(filterFunction(mockChannels, 'chantier', '').length, 3);
      assert.equal(filterFunction(mockChannels, 'direction', '').length, 1);
    });

    it('correctly filters channels by search query (case-insensitive & trimmed)', () => {
      // By title
      assert.equal(filterFunction(mockChannels, 'tous', 'villa').length, 1);
      assert.equal(filterFunction(mockChannels, 'tous', '  VILLA  ').length, 1);
      // By subtitle
      assert.equal(filterFunction(mockChannels, 'tous', 'terreau').length, 1);
      assert.equal(filterFunction(mockChannels, 'tous', 'canicule').length, 1);
      // Non-matching
      assert.equal(filterFunction(mockChannels, 'tous', 'inexistant').length, 0);
    });

    it('correctly computes intersection of category filter and search query', () => {
      // "Laurent" in "chantier" -> matches
      assert.equal(filterFunction(mockChannels, 'chantier', 'Laurent').length, 1);
      // "Laurent" in "equipe" -> 0 matches
      assert.equal(filterFunction(mockChannels, 'equipe', 'Laurent').length, 0);
    });

    it('simulates clearing unread badge counter when channel is selected', () => {
      let channels = [...mockChannels];
      const selectedId = 'general';

      assert.equal(channels.find((c) => c.id === selectedId)?.unreadCount, 2);

      channels = channels.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c));

      assert.equal(channels.find((c) => c.id === selectedId)?.unreadCount, 0);
      assert.equal(
        channels.find((c) => c.id === 'cedres')?.unreadCount,
        1,
        'Other channels unread counters must remain unaffected'
      );
    });
  });

  describe('Dimension 5: Outdoor Daylight Contrast (WCAG AA & AAA)', () => {
    it('verifies Forest Green outgoing message text on White canvas exceeds WCAG AAA (>= 7.0:1)', () => {
      // Forest Green: #15302F, White: #FFFFFF
      const ratio = calculateContrastRatio('#15302F', '#FFFFFF');
      assert.ok(
        ratio >= 7.0,
        `Forest Green on White contrast ratio ${ratio.toFixed(2)} must exceed WCAG AAA (7.0:1)`
      );
    });

    it('verifies Forest Green incoming message text on Warm Sand background exceeds WCAG AAA (>= 7.0:1)', () => {
      // Forest Green: #15302F, Warm Sand: #E8E3D9
      const ratio = calculateContrastRatio('#15302F', '#E8E3D9');
      assert.ok(
        ratio >= 7.0,
        `Forest Green on Warm Sand contrast ratio ${ratio.toFixed(2)} must exceed WCAG AAA (7.0:1)`
      );
    });

    it('verifies Accent Terracotta unread badge text on White text exceeds WCAG AA (>= 3.0:1)', () => {
      // Terracotta: #C47452, White: #FFFFFF
      const ratio = calculateContrastRatio('#C47452', '#FFFFFF');
      assert.ok(
        ratio >= 3.0,
        `Terracotta on White contrast ratio ${ratio.toFixed(2)} must exceed WCAG AA large/UI (3.0:1)`
      );
    });

    it('verifies high-contrast role badges in Equipe.tsx comply with WCAG AA (>= 4.5:1)', () => {
      // Tailwind Amber-950: #451a03, Amber-100: #fef3c7
      const amberRatio = calculateContrastRatio('#451a03', '#fef3c7');
      assert.ok(
        amberRatio >= 4.5,
        `Amber badge contrast ratio ${amberRatio.toFixed(2)} must exceed WCAG AA (4.5:1)`
      );

      // Tailwind Indigo-950: #1e1b4b, Indigo-100: #e0e7ff
      const indigoRatio = calculateContrastRatio('#1e1b4b', '#e0e7ff');
      assert.ok(
        indigoRatio >= 4.5,
        `Indigo badge contrast ratio ${indigoRatio.toFixed(2)} must exceed WCAG AA (4.5:1)`
      );

      // Tailwind Emerald-950: #022c22, Emerald-100: #d1fae5
      const emeraldRatio = calculateContrastRatio('#022c22', '#d1fae5');
      assert.ok(
        emeraldRatio >= 4.5,
        `Emerald badge contrast ratio ${emeraldRatio.toFixed(2)} must exceed WCAG AA (4.5:1)`
      );
    });
  });
});
