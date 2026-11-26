import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/useTheme';
import type { ThemePreference } from '../../types/theme';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', label: 'Système', icon: Monitor },
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
];

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

interface ThemeSelectorProps {
  compact?: boolean;
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  compact = false,
  className = '',
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (compact) {
    const currentOption = THEME_OPTIONS.find((opt) => opt.value === theme) || THEME_OPTIONS[0];
    const CurrentIcon = currentOption.icon;
    const nextTheme =
      THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length] || 'system';

    return (
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        aria-label={`Changer le thème (actuel : ${currentOption.label})`}
        title={`Thème : ${currentOption.label} — Cliquer pour changer`}
        className={`min-h-[48px] px-3 py-2 rounded-2xl bg-white dark:bg-[#172322] border border-sable/80 dark:border-[#2A3F3C] text-foret dark:text-[#EDF2F0] shadow-soft hover:bg-craie dark:hover:bg-[#1E2E2C] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold ${className}`}
      >
        <CurrentIcon className="w-4 h-4 text-terracotta dark:text-[#E38D69]" />
        <span>{currentOption.label}</span>
      </button>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div
        role="radiogroup"
        aria-label="Sélection du thème d'affichage"
        className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-craie dark:bg-[#1E2E2C] border border-sable/80 dark:border-[#304744]"
      >
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(option.value)}
              className={`min-h-[48px] px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-foret text-white shadow-xs dark:bg-[#235852] dark:text-[#F2F7F5] dark:border dark:border-[#397A75]/60'
                  : 'text-foret/75 hover:text-foret hover:bg-white/70 dark:text-[#B8C7C2] dark:hover:text-[#EDF2F0] dark:hover:bg-[#263A37]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isSelected ? 'text-sable dark:text-[#D5E6DC]' : 'text-sauge dark:text-[#9BB89B]'
                }`}
              />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-foret/70 dark:text-[#B8C7C2] font-medium px-0.5">
        {theme === 'system'
          ? `Suit automatiquement l'appareil (actuellement ${
              resolvedTheme === 'dark' ? 'sombre' : 'clair'
            }).`
          : theme === 'dark'
            ? 'Thème sombre forcé — optimisé intérieur et faible luminosité.'
            : 'Thème clair forcé — contraste maximal plein soleil.'}
      </p>
    </div>
  );
};
