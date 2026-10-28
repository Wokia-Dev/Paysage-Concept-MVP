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
