import { useEffect, useState } from 'react';
import { db, getTodayDateString } from '../lib/db';
import type { Profile, Chantier, Affectation, UserRole } from '../types/database';
import {
  Phone,
  MessageSquare,
  MapPin,
  User,
  ShieldCheck,
  Wrench,
  Search,
  Users,
  X,
} from 'lucide-react';

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
        return {
          label: "Chef d'équipe",
          icon: ShieldCheck,
          color:
            'bg-amber-100/90 text-amber-950 border-amber-300 dark:bg-amber-950/75 dark:text-amber-300 dark:border-amber-700/60',
        };
      case 'admin':
        return {
          label: 'Direction / Conducteur',
          icon: User,
          color:
            'bg-indigo-100/90 text-indigo-950 border-indigo-300 dark:bg-indigo-950/75 dark:text-indigo-300 dark:border-indigo-700/60',
        };
      default:
        return {
          label: 'Ouvrier paysagiste',
          icon: Wrench,
          color:
            'bg-emerald-100/90 text-emerald-950 border-emerald-300 dark:bg-emerald-950/75 dark:text-emerald-300 dark:border-emerald-700/60',
        };
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto pb-6">
      {/* En-tête Biophilique & Recherche */}
      <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-foret dark:text-[#EDF2F0] tracking-tight">
              Équipe & Contact
            </h1>
            <p className="text-xs text-sauge dark:text-[#9BB89B] font-medium mt-0.5">
              Annuaire des salariés et affectations du jour
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sable/60 dark:bg-[#1E2E2C] text-foret dark:text-[#9BB89B] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-foret dark:text-[#9BB89B]" />
          </div>
        </div>

        {/* Barre de recherche avec touch target ergonomique */}
        <div className="relative">
          <Search className="w-4 h-4 text-foret/40 dark:text-[#8FA5A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un collègue par nom ou prénom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Filtres par Rôle - Minimum 48px height per button */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
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
              className={`min-h-[48px] px-4 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                filterRole === f.id
                  ? 'bg-foret text-sable shadow-xs dark:bg-[#235852] dark:text-[#EDF2F0]'
                  : 'bg-white text-foret/70 border border-sable/80 hover:bg-craie dark:bg-[#1E2E2C] dark:text-[#B8C7C2] dark:border-[#304744] dark:hover:bg-[#263A37]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste de l'équipe */}
      <div className="space-y-3">
        {filteredProfiles.length === 0 ? (
          <div className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-8 border border-sable/80 dark:border-[#2A3F3C] text-center space-y-2 shadow-soft">
            <Users className="w-8 h-8 mx-auto text-sauge/50 dark:text-[#9BB89B]/60" />
            <p className="text-xs font-bold text-foret dark:text-[#EDF2F0]">Aucun équipier trouvé</p>
            <p className="text-[11px] text-foret/60 dark:text-[#B8C7C2]">
              Modifiez votre recherche ou réinitialisez le filtre de rôle.
            </p>
          </div>
        ) : (
          filteredProfiles.map((member) => {
            const badge = getRoleBadge(member.role);
            const Icon = badge.icon;
            const assignedChantier = getTodayChantierForMember(member.id);

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-[#172322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5 hover:border-sauge dark:hover:border-[#4A6B66] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-foret dark:bg-[#235852] text-sable dark:text-[#D5E6DC] font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
                      {member.prenom.charAt(0)}
                      {member.nom.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-extrabold text-sm text-foret dark:text-[#EDF2F0] leading-snug truncate">
                        {member.prenom} {member.nom}
                      </h2>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${badge.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'appel et SMS rapides avec min 48x48px hit area */}
                  {member.telephone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${member.telephone}`}
                        aria-label={`Appeler ${member.prenom} ${member.nom}`}
                        className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60 dark:hover:bg-emerald-900/70"
                        title="Appeler"
                      >
                        <Phone className="w-4 h-4 text-emerald-800 dark:text-emerald-300" />
                      </a>
                      <a
                        href={`sms:${member.telephone}`}
                        aria-label={`Envoyer un SMS à ${member.prenom} ${member.nom}`}
                        className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-2xl bg-sky-50 text-sky-900 border border-sky-300 hover:bg-sky-100 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700/60 dark:hover:bg-sky-900/70"
                        title="Envoyer un SMS"
                      >
                        <MessageSquare className="w-4 h-4 text-sky-800 dark:text-sky-300" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Chantier d'affectation aujourd'hui */}
                <div className="p-3 bg-craie dark:bg-[#1E2E2C] rounded-2xl border border-sable/60 dark:border-[#304744] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-terracotta dark:text-[#E38D69] shrink-0" />
                    <span className="text-foret/80 dark:text-[#EDF2F0] text-xs font-medium truncate">
                      {assignedChantier
                        ? `Aujourd'hui : ${assignedChantier.nom_client}`
                        : 'Aucun chantier affecté ce jour'}
                    </span>
                  </div>
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-2"
                    title="Disponible"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
