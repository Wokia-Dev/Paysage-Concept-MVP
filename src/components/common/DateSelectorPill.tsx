import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateSelectorPillProps {
  selectedDate: string; // YYYY-MM-DD
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday?: () => void;
  isToday?: boolean;
  variant?: 'header' | 'canvas';
  className?: string;
}

export const DateSelectorPill: React.FC<DateSelectorPillProps> = ({
  selectedDate,
  onPrevDay,
  onNextDay,
  onToday,
  isToday = false,
  variant = 'header',
  className = '',
}) => {
  // Parse date safely with midday UTC to prevent timezone shifts
  const [year, month, day] = selectedDate.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1);

  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);

  // Capitalize first letter of weekday
  const capitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const isHeader = variant === 'header';

  return (
    <div
      className={`inline-flex items-center justify-between rounded-full shadow-xs transition-colors ${
        isHeader
          ? 'bg-white/10 hover:bg-white/15 border border-white/20 text-white'
          : 'bg-white border border-sable/80 text-foret'
      } ${className}`}
    >
      {/* Previous Day Arrow (Min 48x48px Touch Target) */}
      <button
        type="button"
        onClick={onPrevDay}
        className={`min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          isHeader
            ? 'text-sable/80 hover:text-white hover:bg-white/10'
            : 'text-foret/70 hover:text-foret hover:bg-sable/30'
        }`}
        title="Jour précédent"
        aria-label="Jour précédent"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Date Display Pill */}
      <div className="flex items-center gap-1.5 px-2 py-1 text-center select-none">
        <Calendar
          className={`w-3.5 h-3.5 shrink-0 ${
            isHeader ? 'text-sauge' : 'text-terracotta'
          }`}
        />
        <span
          className={`text-xs md:text-sm font-bold tracking-tight ${
            isHeader ? 'text-sable' : 'text-foret'
          }`}
        >
          {capitalized}
        </span>
        {!isToday && onToday && (
          <button
            type="button"
            onClick={onToday}
            className="ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-terracotta text-white hover:bg-terracotta/90 transition-colors cursor-pointer"
            title="Revenir à aujourd'hui"
          >
            Aujourd'hui
          </button>
        )}
      </div>

      {/* Next Day Arrow (Min 48x48px Touch Target) */}
      <button
        type="button"
        onClick={onNextDay}
        className={`min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          isHeader
            ? 'text-sable/80 hover:text-white hover:bg-white/10'
            : 'text-foret/70 hover:text-foret hover:bg-sable/30'
        }`}
        title="Jour suivant"
        aria-label="Jour suivant"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
