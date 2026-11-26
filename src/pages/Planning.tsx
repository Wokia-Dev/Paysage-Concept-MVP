import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { usePlanningData } from '../hooks/usePlanningData';
import { PlanningDayView } from '../components/planning/PlanningDayView';
import { PlanningWeekView } from '../components/planning/PlanningWeekView';
import { PlanningMonthView } from '../components/planning/PlanningMonthView';
import { MemberContactModal } from '../components/planning/MemberContactModal';

export function Planning() {
  const { profile } = useAuth();
  const planning = usePlanningData(profile);
  const isSupervisor = profile?.role === 'chef_equipe' || profile?.role === 'admin';

  return (
    <div className="space-y-4">
      {/* En-tête & Toggle à 3 états (Jour | Semaine | Mois) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-foret">Planning</h1>
          <p className="text-xs text-sauge">
            {profile?.role === 'ouvrier'
              ? 'Vos missions personnelles planifiées'
              : "Missions et planning d'équipe"}
          </p>
        </div>

        <div className="flex bg-sable/60 p-1 rounded-2xl text-xs font-semibold text-foret/80 self-start sm:self-auto shadow-xs border border-sable/50">
          <button
            type="button"
            onClick={() => planning.setViewMode('day')}
            className={`min-h-[48px] min-w-[64px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center font-bold active:scale-95 ${
              planning.viewMode === 'day'
                ? 'bg-white text-foret shadow-xs'
                : 'hover:text-foret text-foret/70'
            }`}
          >
            Jour
          </button>
          <button
            type="button"
            onClick={() => planning.setViewMode('week')}
            className={`min-h-[48px] min-w-[72px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center font-bold active:scale-95 ${
              planning.viewMode === 'week'
                ? 'bg-white text-foret shadow-xs'
                : 'hover:text-foret text-foret/70'
            }`}
          >
            Semaine
          </button>
          <button
            type="button"
            onClick={() => {
              planning.syncMonthWithDate(planning.selectedDate);
              planning.setViewMode('month');
            }}
            className={`min-h-[48px] min-w-[64px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center font-bold active:scale-95 ${
              planning.viewMode === 'month'
                ? 'bg-white text-foret shadow-xs'
                : 'hover:text-foret text-foret/70'
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* Sélecteur de supervision pour Chef d'équipe & Admin */}
      {isSupervisor && profile && (
        <div className="bg-white rounded-2xl p-3 border border-sable/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sauge uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Vue du planning
            </span>
            <span className="text-[11px] text-foret/60">Filtrer par équipier</span>
          </div>

          <div className="flex gap-2">
            <select
              value={planning.supervisorFilter}
              onChange={(e) => planning.setSupervisorFilter(e.target.value)}
              className="w-full min-h-[48px] text-xs font-bold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20 appearance-none pr-8 cursor-pointer"
            >
              <option value="mine">
                👤 Mon planning personnel ({profile.prenom} {profile.nom})
              </option>
              <option value="all">👥 Toute l'équipe (Vue globale chantiers)</option>
              <optgroup label="Planning individuel par ouvrier">
                {planning.profiles
                  .filter((p) => p.id !== profile.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Planning de : {p.prenom} {p.nom} (
                      {p.role === 'chef_equipe' ? 'Chef' : 'Ouvrier'})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      {planning.viewMode === 'day' && (
        <PlanningDayView
          profile={profile}
          selectedDate={planning.selectedDate}
          weekAnchorDate={planning.weekAnchorDate}
          weekLabel={planning.weekLabel}
          weekDays={planning.weekDays}
          selectedDayLabel={planning.selectedDayLabel}
          currentDayMissions={planning.currentDayMissions}
          targetFilterProfileId={planning.targetFilterProfileId}
          onPrevWeek={planning.handlePrevWeek}
          onNextWeek={planning.handleNextWeek}
          onJumpToday={planning.handleJumpToday}
          onSelectDate={planning.handleSelectDate}
          onContactMember={planning.setContactMember}
        />
      )}

      {planning.viewMode === 'week' && (
        <PlanningWeekView
          selectedDate={planning.selectedDate}
          weekAnchorDate={planning.weekAnchorDate}
          weekLabel={planning.weekLabel}
          weekDays={planning.weekDays}
          onPrevWeek={planning.handlePrevWeek}
          onNextWeek={planning.handleNextWeek}
          onJumpToday={planning.handleJumpToday}
          onOpenDay={(dateStr) => {
            planning.handleSelectDate(dateStr);
            planning.setViewMode('day');
          }}
          getMissionsForDate={planning.getMissionsForDate}
        />
      )}

      {planning.viewMode === 'month' && (
        <PlanningMonthView
          selectedDate={planning.selectedDate}
          monthOffset={planning.monthOffset}
          currentMonthLabel={planning.currentMonthLabel}
          monthGridDays={planning.monthGridDays}
          selectedDayLabel={planning.selectedDayLabel}
          currentDayMissions={planning.currentDayMissions}
          onPrevMonth={() => planning.setMonthOffset((prev) => prev - 1)}
          onNextMonth={() => planning.setMonthOffset((prev) => prev + 1)}
          onJumpToday={planning.handleJumpToday}
          onSelectDate={planning.handleSelectDate}
          onSwitchToDayView={() => planning.setViewMode('day')}
        />
      )}

      {planning.contactMember && (
        <MemberContactModal
          member={planning.contactMember}
          currentUserId={profile?.id}
          onClose={() => planning.setContactMember(null)}
        />
      )}
    </div>
  );
}
