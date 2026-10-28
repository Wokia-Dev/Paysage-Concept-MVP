import React from 'react';
import { formatHours } from '../../lib/hours';
import { Pencil, Check } from 'lucide-react';

interface CircularProgressGaugeProps {
  value: number; // Current logged hours
  target: number; // Daily target hours
  size?: number; // Outer SVG dimension (px)
  strokeWidth?: number; // Arc thickness
  className?: string;
  onEditTarget?: (e: React.MouseEvent) => void;
  isEditingTarget?: boolean;
}

export const CircularProgressGauge: React.FC<CircularProgressGaugeProps> = ({
  value,
  target,
  size = 210,
  strokeWidth = 16,
  className = '',
  onEditTarget,
  isEditingTarget = false,
}) => {
  const radius = 76;
  const center = 100;
  const circumference = 2 * Math.PI * radius; // ~477.52
  const sweepAngle = 260; // 260-degree horseshoe sweep
  const arcLength = circumference * (sweepAngle / 360); // ~344.87
  const gapLength = circumference - arcLength; // ~132.65

  const targetSafe = target > 0 ? target : 7;
  const progressRatio = Math.max(0, value / targetSafe);
  const clampedRatio = Math.min(1, progressRatio);
  const filledLength = clampedRatio * arcLength;
  const percentage = Math.round(progressRatio * 100);

  // Format large display hours: e.g. "8h 00"
  const wholeHours = Math.floor(value);
  const minutes = Math.round((value - wholeHours) * 60);
  const formattedLargeHours = `${wholeHours}h ${String(minutes).padStart(2, '0')}`;

  // Gauge arc color based on progress (only met if target reached AND value > 0)
  const isTargetMet = value >= targetSafe && value > 0;
  const arcColor = isTargetMet ? '#15302F' : '#8FA98F';

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="transform overflow-visible"
        aria-label={`Progression des heures : ${formattedLargeHours} sur un objectif de ${formatHours(targetSafe)}`}
        role="img"
      >
        <defs>
          <linearGradient id="horseshoeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#15302F" />
            <stop offset="100%" stopColor={value > targetSafe ? '#C47452' : arcColor} />
          </linearGradient>
        </defs>

        {/* Background Track (Sage/Sand muted green) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E8E3D9"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${gapLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(140 ${center} ${center})`}
          className="transition-colors duration-300"
        />

        {/* Foreground Active Arc (Forest Green / Terracotta gradient) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#horseshoeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${filledLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(140 ${center} ${center})`}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Centered Typography & Info */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 text-center pointer-events-none">
        {/* Hours Display (32px+ bold) */}
        <span className="text-3xl font-black text-foret tracking-tight leading-none">
          {formattedLargeHours}
        </span>

        {/* Subtitle / Daily Target */}
        <div className="mt-1.5 pointer-events-auto">
          {onEditTarget ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditTarget(e);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                isEditingTarget
                  ? 'bg-foret text-white border-foret ring-2 ring-sauge/50'
                  : 'bg-craie/90 hover:bg-white text-foret border-sable/80 hover:border-sauge hover:shadow-xs'
              }`}
              title="Modifier l'objectif journalier"
              aria-label="Modifier l'objectif journalier"
            >
              <span className="text-xs font-bold tracking-tight">
                Objectif : {formatHours(targetSafe)}
              </span>
              <span className={`p-0.5 rounded-full flex items-center justify-center ${isEditingTarget ? 'text-emerald-400' : 'text-sauge'}`}>
                {isEditingTarget ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
                )}
              </span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-foret/70">
              Objectif : {formatHours(targetSafe)}
            </span>
          )}
        </div>

        {/* Percentage Badge */}
        <span
          className={`mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
            isTargetMet
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : value > 0
              ? 'bg-sable/60 text-foret font-semibold'
              : 'bg-sable/40 text-foret/70 font-medium'
          }`}
        >
          {isTargetMet ? (
            <>Objectif atteint 🎯 ({percentage}% atteint)</>
          ) : value > 0 ? (
            <>{percentage}% atteint</>
          ) : (
            <>Non renseigné (0% atteint)</>
          )}
        </span>
      </div>
    </div>
  );
};
