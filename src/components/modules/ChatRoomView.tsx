import { useState, useRef, useEffect } from 'react';
import type { ChatConversation, ChatMessage } from '../../types/chat';
import {
  ArrowLeft,
  Send,
  Lock,
  Users,
  Briefcase,
  Trees,
  CheckCheck,
  Sparkles,
} from 'lucide-react';

interface ChatRoomViewProps {
  conversation: ChatConversation;
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string) => void;
}

export function ChatRoomView({
  conversation,
  onBack,
  onSendMessage,
}: ChatRoomViewProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(conversation.id, trimmed);
    setInputText('');
  };

  const getCategoryIcon = () => {
    switch (conversation.category) {
      case 'equipe':
        return <Trees className="w-4 h-4 text-foret" />;
      case 'chantier':
        return <Briefcase className="w-4 h-4 text-terracotta" />;
      case 'direction':
        return <Lock className="w-4 h-4 text-foret/70" />;
    }
  };

  const getCategoryLabel = () => {
    switch (conversation.category) {
      case 'equipe':
        return "Canal d'équipe";
      case 'chantier':
        return 'Canal de chantier';
      case 'direction':
        return 'Direction & Encadrement';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-md mx-auto">
      {/* 1. Header de la conversation */}
      <header className="bg-white rounded-2xl border border-sable/80 shadow-soft p-2.5 flex items-center justify-between gap-2 shrink-0 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour à la liste des canaux"
            className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-2xl flex items-center justify-center text-foret hover:bg-sable/50 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foret" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-sable/60 shrink-0">
                {getCategoryIcon()}
              </span>
              <h1 className="text-sm font-extrabold text-foret truncate">
                {conversation.title}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-foret/60 mt-0.5">
              <span>{getCategoryLabel()}</span>
              {conversation.participantsCount && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-sauge" />
                    {conversation.participantsCount} membres
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Badge mode démo mock statique */}
        <div className="shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sable/70 text-foret text-[10px] font-bold border border-sable">
            <Sparkles className="w-3 h-3 text-terracotta" />
            Mock R6
          </span>
        </div>
      </header>

      {/* 2. Zone de messages avec défilement */}
      <div className="flex-1 overflow-y-auto px-1 space-y-3 pb-2 no-scrollbar">
        {/* Séparateur temporel */}
        <div className="flex items-center justify-center my-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sauge bg-sable/50 border border-sable/60 px-3 py-1 rounded-full">
            Aujourd'hui
          </span>
        </div>

        {conversation.messages.map((msg: ChatMessage) => {
          if (msg.isOutgoing) {
            return (
              <div
                key={msg.id}
                className="flex flex-col items-end space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="bg-foret text-blanc rounded-2xl rounded-tr-xs shadow-xs px-4 py-3 max-w-[85%] text-xs leading-relaxed">
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-foret/60 pr-1">
                  <span>{msg.timestamp}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sauge" />
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className="flex items-start gap-2.5 max-w-[88%] animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="w-8 h-8 rounded-xl bg-sauge text-foret font-extrabold text-xs flex items-center justify-center shrink-0 mt-1 shadow-xs border border-sable">
                {msg.senderName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>

              <div className="flex flex-col items-start space-y-1 min-w-0">
                <span className="text-[11px] font-bold text-foret/80 pl-1">
                  {msg.senderName}
                </span>
                <div className="bg-sable/80 text-foret rounded-2xl rounded-tl-xs border border-sable px-4 py-3 shadow-xs text-xs leading-relaxed">
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <span className="text-[10px] text-foret/60 pl-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Zone de saisie avec bouton Envoyer ergonomique */}
      <footer className="pt-2 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-sable/80 shadow-soft p-1.5 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Écrire un message à l'équipe..."
            className="flex-1 min-h-[48px] px-4 bg-craie rounded-xl text-xs text-foret placeholder:text-foret/40 border border-sable/50 focus:outline-none focus:ring-2 focus:ring-foret/20"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Envoyer le message"
            className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-foret hover:bg-foret/90 text-sable font-bold flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4 text-sable" />
          </button>
        </form>
      </footer>
    </div>
  );
}
