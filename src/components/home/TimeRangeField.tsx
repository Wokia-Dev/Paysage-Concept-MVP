import React from 'react';
import { Clock, Minus, Plus } from 'lucide-react';
import { adjustTimeString } from '../../lib/hours';

interface TimeRangeFieldProps {
  inputId: string;
  label: string;
  shortLabel: string;
  value: string;
  fallbackTime: string;
  presets: string[];
  decreaseAriaLabel: string;
  increaseAriaLabel: string;
  inputAriaLabel: string;
  onChange: (newValue: string) => void;
}

export const TimeRangeField: React.FC<TimeRangeFieldProps> = ({
  inputId,
  label,
  shortLabel,
  value,
  fallbackTime,
  presets,
  decreaseAriaLabel,
  increaseAriaLabel,
  inputAriaLabel,
  onChange,
}) => {
  return (
    <div className="space-y-2 bg-craie p-3.5 rounded-2xl border border-sable/80">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-xs font-bold text-foret">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(adjustTimeString(value || fallbackTime, -15))}
            className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
            aria-label={decreaseAriaLabel}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange(adjustTimeString(value || fallbackTime, 15))}
            className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-white hover:bg-sable border border-sable flex items-center justify-center text-foret cursor-pointer shadow-xs active:scale-95"
            aria-label={increaseAriaLabel}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteneur tactile interactif stylisé avec input transparent superposé */}
      <div className="relative w-full min-h-[52px] h-[52px] bg-white rounded-2xl border-2 transition-all flex items-center px-3.5 gap-3 cursor-pointer shadow-2xs border-sable hover:border-foret/40 focus-within:border-foret focus-within:ring-2 focus-within:ring-foret/20">
        <div className="w-8 h-8 rounded-xl bg-foret/10 flex items-center justify-center text-foret shrink-0">
          <Clock className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-sauge uppercase tracking-wider leading-none">
            {shortLabel}
          </span>
          <span
            className={`text-xl font-black tracking-tight leading-tight ${
              value ? 'text-foret' : 'text-foret/40 font-semibold'
            }`}
          >
            {value ? value.replace(':', 'h') : "Choisir l'heure"}
          </span>
        </div>
        <input
          id={inputId}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          aria-label={inputAriaLabel}
        />
      </div>

      {/* Boutons rapides */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {presets.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`min-h-[48px] px-3 font-bold rounded-xl border transition-colors cursor-pointer text-xs ${
              value === val
                ? 'bg-foret text-white border-foret shadow-xs'
                : 'bg-white text-foret/80 border-sable hover:bg-sable/50'
            }`}
          >
            {val.replace(':', 'h')}
          </button>
        ))}
      </div>
    </div>
  );
};
