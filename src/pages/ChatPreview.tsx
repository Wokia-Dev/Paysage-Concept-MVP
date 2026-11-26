import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChatConversation, ChatMessage, FilterCategory } from '../types/chat';
import { INITIAL_CHANNELS } from '../data/mockChannels';
import { ChatRoomView } from '../components/modules/ChatRoomView';
import {
  MessageSquare,
  Trees,
  Briefcase,
  Lock,
  Search,
  Sparkles,
  Clock,
  X,
} from 'lucide-react';

const FILTER_TABS: {
  key: FilterCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'tous', label: 'Tous', icon: MessageSquare },
  { key: 'equipe', label: 'Équipe', icon: Trees },
  { key: 'chantier', label: 'Chantier', icon: Briefcase },
  { key: 'direction', label: 'Direction', icon: Lock },
];

export function ChatPreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [channels, setChannels] = useState<ChatConversation[]>(INITIAL_CHANNELS);
  const [activeTab, setActiveTab] = useState<FilterCategory>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    const channelParam = searchParams.get('channel') || searchParams.get('chantier');
    if (!channelParam) return null;
    const match = INITIAL_CHANNELS.find(
      (c) =>
        c.id.toLowerCase() === channelParam.toLowerCase() ||
        (c.chantierId && c.chantierId.toLowerCase() === channelParam.toLowerCase())
    );
    return match ? match.id : null;
  });

  const activeConversationId = selectedConversationId;

  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      const matchesTab = activeTab === 'tous' || c.category === activeTab;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.title.toLowerCase().includes(query) ||
        c.subtitle.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [channels, activeTab, searchQuery]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return channels.find((c) => c.id === activeConversationId) || null;
  }, [channels, activeConversationId]);

  const handleSelectConversation = (id: string) => {
    // Mark as read in local state
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    setSelectedConversationId(id);
  };

  const handleSendMessage = (conversationId: string, content: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user',
      senderName: 'Moi',
      content,
      timestamp: nowTime,
      isOutgoing: true,
    };

    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === conversationId
          ? {
              ...ch,
              subtitle: `Moi : ${content}`,
              time: "À l'instant",
              messages: [...ch.messages, newMsg],
            }
          : ch
      )
    );
  };

  const handleBackFromRoom = () => {
    setSelectedConversationId(null);
    if (searchParams.get('channel') || searchParams.get('chantier')) {
      const next = new URLSearchParams(searchParams);
      next.delete('channel');
      next.delete('chantier');
      setSearchParams(next, { replace: true });
    }
  };

  // If a conversation is active, render interactive preview room
  if (activeConversation) {
    return (
      <ChatRoomView
        conversation={activeConversation}
        onBack={handleBackFromRoom}
        onSendMessage={handleSendMessage}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto pb-6">
      {/* 1. En-tête Biophilique */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-foret dark:text-[#EDF2F0] tracking-tight">
              Messagerie d'équipe
            </h1>
            <p className="text-xs text-sauge dark:text-[#9BB89B] font-medium mt-0.5">
              Canaux de communication par chantier & équipe
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sable/60 dark:bg-[#1E2E2C] text-foret dark:text-[#EDF2F0] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-terracotta dark:text-[#E38D69]" />
          </div>
        </div>

        {/* Barre de Recherche ergonomique */}
        <div className="relative">
          <Search className="w-4 h-4 text-foret/40 dark:text-[#8FA5A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une conversation ou un chantier..."
            className="w-full min-h-[48px] pl-10 pr-9 bg-craie dark:bg-[#1E2E2C] rounded-2xl border border-sable dark:border-[#304744] text-xs text-foret dark:text-[#EDF2F0] placeholder:text-foret/40 dark:placeholder:text-[#8FA5A0] focus:outline-none focus:ring-2 focus:ring-foret/20 dark:focus:ring-sauge/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Effacer la recherche"
              className="min-w-[48px] min-h-[48px] w-12 h-12 absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-foret/40 hover:text-foret dark:text-[#8FA5A0] dark:hover:text-[#EDF2F0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Onglets Filtres : Tous | Équipe | Chantier | Direction */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-[48px] px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-foret text-sable shadow-xs dark:bg-[#235852] dark:text-[#EDF2F0]'
                    : 'bg-white text-foret/70 border border-sable/80 hover:bg-craie dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#304744] dark:hover:bg-[#263A37]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sauge dark:text-[#9BB89B]' : 'text-foret/60 dark:text-[#8FA5A0]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Bannière Phase 2 Biophilique */}
      <div className="bg-foret dark:bg-[#183330] text-sable dark:text-[#EDF2F0] rounded-2xl sm:rounded-3xl p-4 shadow-soft space-y-1.5 relative overflow-hidden border border-foret/20 dark:border-[#2E5752]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta dark:text-[#E38D69] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-sable dark:text-[#D5E6DC]">
            Aperçu Haute Fidélité (Phase 2)
          </span>
        </div>
        <p className="text-xs text-sable/90 dark:text-[#B8C7C2] leading-relaxed">
          Sélectionnez un canal ci-dessous pour tester la messagerie mockée (bulles Vert Forêt & Sable).
          Les WebSockets temps réel seront branchés en Phase 2.
        </p>
      </div>

      {/* 3. Liste des Canaux */}
      <div className="space-y-2.5">
        {filteredChannels.length === 0 ? (
          <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-8 border border-sable/80 dark:border-[#2A3F3C] text-center space-y-2 shadow-soft">
            <MessageSquare className="w-8 h-8 mx-auto text-sauge/50 dark:text-[#9BB89B]/60" />
            <p className="text-xs font-bold text-foret dark:text-[#EDF2F0]">Aucun canal trouvé</p>
            <p className="text-[11px] text-foret/60 dark:text-[#B8C7C2]">
              Modifiez votre recherche ou sélectionnez un autre onglet.
            </p>
          </div>
        ) : (
          filteredChannels.map((ch) => {
            const isEquipe = ch.category === 'equipe';
            const isDirection = ch.category === 'direction';

            return (
              <div
                key={ch.id}
                onClick={() => handleSelectConversation(ch.id)}
                className="min-h-[56px] p-4 bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl border border-sable/80 dark:border-[#2A3F3C] shadow-soft hover:border-sauge dark:hover:border-[#4A6B66] transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-sable/60 dark:bg-[#1E2E2C] text-foret dark:text-[#EDF2F0] flex items-center justify-center shrink-0 border border-sable/50 dark:border-[#304744] group-hover:scale-105 transition-transform">
                    {isEquipe ? (
                      <Trees className="w-5 h-5 text-foret dark:text-[#9BB89B]" />
                    ) : isDirection ? (
                      <Lock className="w-5 h-5 text-foret/80 dark:text-[#B8C7C2]" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-terracotta dark:text-[#E38D69]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-extrabold text-foret dark:text-[#EDF2F0] truncate">
                        {ch.title}
                      </h2>
                      {isDirection && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable text-foret border border-sable/80 dark:bg-[#263A37] dark:text-[#D5E6DC] dark:border-[#38524E] shrink-0">
                          Direction
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foret/70 dark:text-[#B8C7C2] truncate mt-0.5">
                      {ch.subtitle}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end justify-center">
                  <span className="text-[11px] text-sauge dark:text-[#9BB89B] font-medium block">
                    {ch.time}
                  </span>
                  {ch.unreadCount > 0 ? (
                    <span className="bg-terracotta text-white text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 shadow-xs animate-in zoom-in duration-200">
                      {ch.unreadCount}
                    </span>
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-foret/30 dark:text-[#8FA5A0] inline-block mt-1" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
