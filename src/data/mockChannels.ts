import type { ChatConversation } from '../types/chat';

export const INITIAL_CHANNELS: ChatConversation[] = [
  {
    id: 'general',
    title: 'Équipe Paysage Concept',
    category: 'equipe',
    subtitle: 'Sophie Vasseur : Rappel livraison terreau demain 7h30',
    time: '08:14',
    unreadCount: 2,
    participantsCount: 8,
    messages: [
      {
        id: 'm1',
        senderId: 'sophie',
        senderName: 'Sophie Vasseur',
        content:
          'Bonjour à tous ! Petit rappel pour demain : livraison des 15m³ de terreau enrichi directement sur le dépôt à 7h30.',
        timestamp: '08:10',
        isOutgoing: false,
      },
      {
        id: 'm2',
        senderId: 'marc',
        senderName: 'Marc Vasseur',
        content:
          'Bien noté Sophie, Lucas et moi on sera là pour décharger avec le godet.',
        timestamp: '08:12',
        isOutgoing: false,
      },
      {
        id: 'm3',
        senderId: 'user',
        senderName: 'Moi',
        content: "Super, j'ai préparé la bâche de protection au fond de l'atelier.",
        timestamp: '08:14',
        isOutgoing: true,
      },
    ],
  },
  {
    id: 'laurent',
    title: 'Chantier Villa Laurent',
    category: 'chantier',
    subtitle: 'Marc : Enrochements terminés, on attaque la terrasse ipé',
    time: 'Hier',
    unreadCount: 0,
    chantierId: 'c1',
    participantsCount: 4,
    messages: [
      {
        id: 'ml1',
        senderId: 'marc',
        senderName: 'Marc Vasseur',
        content:
          'Enrochements terminés, la pente est bien calée. Demain on attaque les lambourdes de la terrasse ipé.',
        timestamp: 'Hier 16:30',
        isOutgoing: false,
      },
      {
        id: 'ml2',
        senderId: 'user',
        senderName: 'Moi',
        content: "Top ! Les vis inox et les cales d'écartement sont dans le fourgon.",
        timestamp: 'Hier 17:05',
        isOutgoing: true,
      },
      {
        id: 'ml3',
        senderId: 'marc',
        senderName: 'Marc Vasseur',
        content:
          'Parfait, pensez aux niveaux laser et aux casques anti-bruit pour la découpe.',
        timestamp: 'Hier 17:15',
        isOutgoing: false,
      },
    ],
  },
  {
    id: 'cedres',
    title: 'Résidence Les Cèdres',
    category: 'chantier',
    subtitle: 'Thomas : Déchetterie pro pleine, prévoir 2ème rotation',
    time: 'Hier',
    unreadCount: 1,
    chantierId: 'c2',
    participantsCount: 3,
    messages: [
      {
        id: 'mc1',
        senderId: 'thomas',
        senderName: 'Thomas Martin',
        content:
          'La taille des haies de cyprès avance bien, mais la déchetterie pro est déjà pleine.',
        timestamp: 'Hier 14:20',
        isOutgoing: false,
      },
      {
        id: 'mc2',
        senderId: 'thomas',
        senderName: 'Thomas Martin',
        content: 'Prévoir une 2ème rotation avec le camion benne avant 17h si possible.',
        timestamp: 'Hier 14:22',
        isOutgoing: false,
      },
    ],
  },
  {
    id: 'beauvallon',
    title: 'Domaine de Beauvallon',
    category: 'chantier',
    subtitle: 'Antoine : Gazon de placage posé avec succès',
    time: 'Lun',
    unreadCount: 0,
    chantierId: 'c3',
    participantsCount: 4,
    messages: [
      {
        id: 'mb1',
        senderId: 'antoine',
        senderName: 'Antoine Petit',
        content:
          'Les 350m² de rouleaux de gazon sont posés et arrosés ! Le rendu est magnifique.',
        timestamp: 'Lun 17:45',
        isOutgoing: false,
      },
    ],
  },
];
