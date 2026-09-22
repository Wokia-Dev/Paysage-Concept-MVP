import { MessageSquare, Trees, Sparkles, Clock, Lock } from 'lucide-react';

export function ChatPreview() {
  const channels = [
    {
      id: 'general',
      title: 'Général Paysage Concept',
      subtitle: 'Sophie (Admin) : Rappel livraison terreau demain 7h30',
      time: '08:14',
      badge: 2,
      type: 'general',
    },
    {
      id: 'laurent',
      title: 'Chantier Villa Laurent',
      subtitle: 'Marc : Enrochements terminés, on attaque la terrasse ipé',
      time: 'Hier',
      badge: 0,
      type: 'chantier',
    },
    {
      id: 'cedres',
      title: 'Résidence Les Cèdres',
      subtitle: 'Thomas : Déchetterie pro pleine, prévoir 2ème rotation',
      time: 'Hier',
      badge: 1,
      type: 'chantier',
    },
    {
      id: 'direction',
      title: 'Direction & Sécurité',
      subtitle: 'Consignes canicule et hydratation chantiers',
      time: 'Lun',
      badge: 0,
      type: 'direction',
    },
  ];

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-extrabold text-foret">Messagerie d'équipe</h1>
        <p className="text-xs text-sauge">Canaux de communication par chantier</p>
      </div>

      {/* Bannière Phase 2 */}
      <div className="bg-foret text-sable rounded-2xl p-4 shadow-md space-y-2 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-sable">
            Phase 2 en approche
          </span>
        </div>
        <p className="text-xs text-sable/90 leading-relaxed">
          Le chat en temps réel (Supabase WebSockets Realtime) et le partage photo compressé
          sont programmés pour le prochain sprint. Les canaux sont déjà structurés ci-dessous.
        </p>
      </div>

      {/* Liste des canaux */}
      <div className="bg-white rounded-2xl border border-sable/80 shadow-xs divide-y divide-sable/60 overflow-hidden">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="p-3.5 flex items-center justify-between hover:bg-craie transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sable/60 text-foret flex items-center justify-center shrink-0">
                {ch.type === 'general' ? (
                  <Trees className="w-5 h-5 text-foret" />
                ) : (
                  <MessageSquare className="w-5 h-5 text-terracotta" />
                )}
              </div>
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foret truncate">{ch.title}</h3>
                  {ch.type === 'direction' && (
                    <Lock className="w-3 h-3 text-foret/40 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-foret/60 truncate mt-0.5">{ch.subtitle}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-sauge font-medium block">{ch.time}</span>
              {ch.badge > 0 ? (
                <span className="inline-block mt-1 bg-terracotta text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {ch.badge}
                </span>
              ) : (
                <Clock className="w-3 h-3 text-foret/30 inline-block mt-1" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
