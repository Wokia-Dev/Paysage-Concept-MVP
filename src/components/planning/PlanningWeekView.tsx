import React from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getTodayDateString } from '../../lib/dates';
import type { DayItem, PlanningMission } from '../../lib/planningUtils';

interface PlanningWeekViewProps {
  selectedDate: string;
  weekAnchorDate: string;
  weekLabel: string;
  weekDays: DayItem[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToday: () => void;
  onOpenDay: (dateStr: string) => void;
  getMissionsForDate: (dateStr: string) => PlanningMission[];
}

export const PlanningWeekView: React.FC<PlanningWeekViewProps> = ({
  selectedDate,
  weekAnchorDate,
  weekLabel,
  weekDays,
  onPrevWeek,
  onNextWeek,
  onJumpToday,
  onOpenDay,
  getMissionsForDate,
}) => {
  const todayStr = getTodayDateString(0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-sable/70 shadow-xs">
        <button
          type="button"
          onClick={onPrevWeek}
          className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          title="Semaine précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-foret capitalize flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-terracotta" />
          {weekLabel}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onJumpToday}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
              selectedDate === todayStr && weekAnchorDate === todayStr
                ? 'bg-craie text-foret/40 border-sable/50'
                : 'bg-sable/80 hover:bg-sable text-foret border-sable shadow-2xs font-extrabold'
            }`}
            title="Revenir à aujourd'hui"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="min-w-[48px] min-h-[48px] rounded-xl hover:bg-craie text-foret/70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="Semaine suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {weekDays.map((day) => {
        const missions = getMissionsForDate(day.dateStr);
        return (
          <div
            key={day.dateStr}
            onClick={() => onOpenDay(day.dateStr)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              day.isToday
                ? 'bg-white border-foret/30 shadow-xs ring-1 ring-foret/20'
                : 'bg-white border-sable/70 hover:border-sauge'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foret">
                  {day.dayName} {day.dayNumber}
                </span>
                {day.isToday && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-foret text-white">
                    Aujourd'hui
                  </span>
                )}
              </div>
              <span className="text-xs text-sauge font-medium">{missions.length} mission(s)</span>
            </div>

            {missions.length === 0 ? (
              <p className="text-xs text-foret/40 italic">Aucune intervention</p>
            ) : (
              <div className="space-y-1.5">
                {missions.map(({ chantier, isUserAssigned }) => (
                  <div
                    key={chantier.id}
                    className="text-xs font-semibold text-foret bg-craie p-2.5 rounded-xl flex items-center justify-between border border-sable/50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{chantier.nom_client}</span>
                      {isUserAssigned && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sable text-foret shrink-0">
                          Moi
                        </span>
                      )}
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
