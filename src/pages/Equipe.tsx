import { useEffect, useState } from 'react';
import { db, getTodayDateString } from '../lib/db';
import type { Profile, Chantier, Affectation, UserRole } from '../types/database';
import { Phone, MessageSquare, MapPin, User, ShieldCheck, Wrench, Search } from 'lucide-react';

export function Equipe() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [todayAffectations, setTodayAffectations] = useState<Affectation[]>([]);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = getTodayDateString(0);

  useEffect(() => {
    async function loadTeamData() {
      const [allProfiles, allChantiers, allAffs] = await Promise.all([
        db.profiles.toArray(),
        db.chantiers.toArray(),
        db.affectations.where('date_intervention').equals(todayStr).toArray(),
      ]);

      setProfiles(allProfiles);
      setChantiers(allChantiers);
      setTodayAffectations(allAffs);
    }
    loadTeamData();
  }, [todayStr]);

  const filteredProfiles = profiles.filter((p) => {
    const matchesRole = filterRole === 'all' || p.role === filterRole;
    const fullName = `${p.prenom} ${p.nom}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getTodayChantierForMember = (profileId: string): Chantier | undefined => {
    const aff = todayAffectations.find((a) => a.profile_id === profileId);
    if (!aff) return undefined;
    return chantiers.find((c) => c.id === aff.chantier_id);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'chef_equipe':
        return { label: "Chef d'équipe", icon: ShieldCheck, color: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'admin':
        return { label: 'Direction / Conducteur', icon: User, color: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
      default:
        return { label: 'Ouvrier paysagiste', icon: Wrench, color: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-extrabold text-foret">Équipe & Contact</h1>
        <p className="text-xs text-sauge">Annuaire des salariés et affectations du jour</p>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="w-4 h-4 text-foret/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un collègue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-sable/80 text-xs text-foret placeholder:text-foret/40 focus:outline-none focus:ring-2 focus:ring-foret/20"
        />
      </div>

      {/* Filtres par Rôle */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'chef_equipe', label: "Chefs d'équipe" },
          { id: 'ouvrier', label: 'Ouvriers' },
          { id: 'admin', label: 'Direction' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterRole(f.id as UserRole | 'all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              filterRole === f.id
                ? 'bg-foret text-sable shadow-xs'
                : 'bg-white text-foret/70 border border-sable hover:bg-craie'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste de l'équipe */}
      <div className="space-y-3">
        {filteredProfiles.map((member) => {
          const badge = getRoleBadge(member.role);
          const Icon = badge.icon;
          const assignedChantier = getTodayChantierForMember(member.id);

          return (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3 hover:border-sauge transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-foret text-sable font-bold text-sm flex items-center justify-center shadow-xs">
                    {member.prenom.charAt(0)}
                    {member.nom.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foret leading-tight">
                      {member.prenom} {member.nom}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Boutons d'appel et SMS rapides */}
                {member.telephone && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${member.telephone}`}
                      className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs"
                      title="Appeler"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`sms:${member.telephone}`}
                      className="p-2.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 active:scale-95 transition-all shadow-xs"
                      title="Envoyer un SMS"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Chantier d'affectation aujourd'hui */}
              <div className="p-2.5 bg-craie rounded-xl border border-sable/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
                  <span className="text-foret/70 text-[11px] truncate">
                    {assignedChantier
                      ? `Aujourd'hui : ${assignedChantier.nom_client}`
                      : 'Aucun chantier affecté ce jour'}
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" title="Disponible" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
