import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface WeeklyCalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  className?: string;
}

export const WeeklyCalendarStrip: React.FC<WeeklyCalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  className = '',
}) => {
  // Parse safely with midday UTC anchor
  const parseMiddayUTC = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
  };

  const formatISODate = (d: Date): string => {
    return d.toISOString().slice(0, 10);
  };

  const selectedDateObj = useMemo(() => parseMiddayUTC(selectedDate), [selectedDate]);

  // Today string in UTC
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }, []);

  // Compute Monday of the week containing selectedDate
  const weekDays = useMemo(() => {
    const d = new Date(selectedDateObj);
    const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diff);

    return Array.from({ length: 7 }, (_, i) => {
      const current = new Date(monday);
      current.setUTCDate(monday.getUTCDate() + i);
      const isoStr = formatISODate(current);

      const dayName = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        timeZone: 'UTC',
      })
        .format(current)
        .replace('.', '')
        .slice(0, 3);

      const dayNumber = current.getUTCDate();
      const isSelected = isoStr === selectedDate;
      const isToday = isoStr === todayStr;

      return {
        isoStr,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        dayNumber,
        isSelected,
        isToday,
      };
    });
  }, [selectedDateObj, selectedDate, todayStr]);

  // Week navigation (-7 days / +7 days)
  const handlePrevWeek = () => {
    const prev = new Date(selectedDateObj);
    prev.setUTCDate(prev.getUTCDate() - 7);
    onSelectDate(formatISODate(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDateObj);
    next.setUTCDate(next.getUTCDate() + 7);
    onSelectDate(formatISODate(next));
  };

  const handleJumpToday = () => {
    onSelectDate(todayStr);
  };

  // Month and Year label in French (e.g. "Octobre 2026")
  const monthYearLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(selectedDateObj);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedDateObj]);

  const isCurrentWeekToday = weekDays.some((w) => w.isToday && w.isSelected);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* En-tête de navigation de la semaine */}
      <div className="flex items-center justify-between text-white px-0.5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-sauge" />
          <span className="text-xs font-bold text-sable tracking-tight">
            {monthYearLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCurrentWeekToday && (
            <button
              type="button"
              onClick={handleJumpToday}
              className="min-h-[32px] px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold text-xs tracking-tight border border-white/20 shadow-2xs transition-all cursor-pointer mr-1 flex items-center justify-center"
              title="Revenir à aujourd'hui"
              aria-label="Revenir à aujourd'hui"
            >
              Aujourd'hui
            </button>
          )}

          <button
            type="button"
            onClick={handlePrevWeek}
            className="min-w-[32px] min-h-[32px] w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-sable flex items-center justify-center transition-colors cursor-pointer"
            title="Semaine précédente"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="min-w-[32px] min-h-[32px] w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-sable flex items-center justify-center transition-colors cursor-pointer"
            title="Semaine suivante"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grille des 7 jours de la semaine */}
      <div className="grid grid-cols-7 gap-1.5 bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xs">
        {weekDays.map((day) => (
          <button
            key={day.isoStr}
            type="button"
            onClick={() => onSelectDate(day.isoStr)}
            className={`min-h-[54px] rounded-xl flex flex-col items-center justify-center py-1 px-0.5 transition-all cursor-pointer relative ${
              day.isSelected
                ? 'bg-white text-foret font-black shadow-md scale-102 ring-2 ring-sauge'
                : 'text-sable/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-tight ${
                day.isSelected ? 'text-foret/70' : 'text-sauge'
              }`}
            >
              {day.dayName}
            </span>
            <span
              className={`text-sm font-extrabold leading-tight mt-0.5 ${
                day.isSelected ? 'text-foret font-black' : 'text-white'
              }`}
            >
              {day.dayNumber}
            </span>

            {/* Indicateur Aujourd'hui */}
            {day.isToday && (
              <span
                className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                  day.isSelected ? 'bg-terracotta ring-1 ring-white' : 'bg-terracotta'
                }`}
                title="Aujourd'hui"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

