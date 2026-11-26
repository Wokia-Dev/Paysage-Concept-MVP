import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { getTodayDateString } from '../../lib/dates';
import type { MonthGridDay, PlanningMission } from '../../lib/planningUtils';

interface PlanningMonthViewProps {
  selectedDate: string;
  monthOffset: number;
  currentMonthLabel: string;
  monthGridDays: MonthGridDay[];
  selectedDayLabel: string;
  currentDayMissions: PlanningMission[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToday: () => void;
  onSelectDate: (dateStr: string) => void;
  onSwitchToDayView: () => void;
}

export const PlanningMonthView: React.FC<PlanningMonthViewProps> = ({
  selectedDate,
  monthOffset,
  currentMonthLabel,
  monthGridDays,
  selectedDayLabel,
  currentDayMissions,
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  onSelectDate,
  onSwitchToDayView,
}) => {
  const todayStr = getTodayDateString(0);

  return (
    <div className="space-y-3">
      {/* Barre de navigation mensuelle avec bouton Aujourd'hui dédié */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-sable/70 shadow-xs">
        <button
          type="button"
          onClick={onPrevMonth}
          className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          title="Mois précédent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-foret capitalize flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-terracotta" />
          {currentMonthLabel}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onJumpToday}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
              monthOffset === 0 && selectedDate === todayStr
                ? 'bg-craie text-foret/40 border-sable/50'
                : 'bg-sable/80 hover:bg-sable text-foret border-sable shadow-2xs font-extrabold'
            }`}
            title="Revenir à aujourd'hui"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="Mois suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendrier Mensuel */}
      <div className="bg-white rounded-3xl p-4 border border-sable/80 shadow-xs space-y-2">
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-sauge pb-2 border-b border-sable/60">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mer</span>
          <span>Jeu</span>
          <span>Ven</span>
          <span>Sam</span>
          <span>Dim</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthGridDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => onSelectDate(day.dateStr)}
                className={`min-h-[48px] p-1 rounded-xl flex flex-col items-center justify-between text-xs transition-all cursor-pointer active:scale-95 border ${
                  isSelected
                    ? 'bg-foret text-sable border-foret shadow-xs font-bold'
                    : day.isToday
                      ? 'bg-foret/10 border-foret/30 text-foret font-extrabold'
                      : day.isCurrentMonth
                        ? 'bg-craie border-sable/50 text-foret/80 hover:bg-sable/30'
                        : 'bg-white/40 border-transparent text-foret/30'
                }`}
              >
                <span className="text-[11px]">{day.dayNumber}</span>

                <div className="flex items-center justify-center gap-0.5 h-2">
                  {day.missionsCount > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        day.hasUserMission
                          ? isSelected
                            ? 'bg-sauge'
                            : 'bg-emerald-600'
                          : isSelected
                            ? 'bg-sable'
                            : 'bg-terracotta'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Résumé du jour sélectionné */}
      <div className="bg-white rounded-2xl p-4 border border-sable/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sauge block capitalize">
              {selectedDayLabel}
            </span>
            <span className="text-xs font-bold text-foret">
              {currentDayMissions.length} chantier(s) programmé(s)
            </span>
          </div>

          <button
            type="button"
            onClick={onSwitchToDayView}
            className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-foret text-white text-xs font-bold hover:bg-foret/90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-sauge" />
            <span>Voir le déroulé</span>
          </button>
        </div>

        {currentDayMissions.length === 0 ? (
          <p className="text-xs text-foret/50 italic py-1">
            Aucune intervention programmée pour ce jour.
          </p>
        ) : (
          <div className="space-y-1.5">
            {currentDayMissions.map(({ chantier, assignedMembers }) => (
              <div
                key={chantier.id}
                className="p-2.5 rounded-xl bg-craie border border-sable/60 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-foret">{chantier.nom_client}</p>
                  <p className="text-[11px] text-foret/60 truncate max-w-[200px]">
                    {chantier.adresse}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-sauge">
                  {assignedMembers.length} équipier(s)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
