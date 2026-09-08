import React from 'react';
import { Badge } from '../ui/Badge';

interface ScoreMeterProps {
  score: number; // 0 to 100
  verdict?: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire';
  size?: 'sm' | 'md' | 'lg';
  showVerdict?: boolean;
}

export const ScoreMeter: React.FC<ScoreMeterProps> = ({
  score,
  verdict,
  size = 'md',
  showVerdict = true,
}) => {
  // Dimensions
  const sizes = {
    sm: { radius: 36, stroke: 6, textClass: 'text-xl', labelClass: 'text-[10px]' },
    md: { radius: 54, stroke: 8, textClass: 'text-3xl', labelClass: 'text-xs' },
    lg: { radius: 72, stroke: 10, textClass: 'text-5xl', labelClass: 'text-sm' },
  };

  const { radius, stroke, textClass, labelClass } = sizes[size];
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 85) return { stroke: '#10b981', bg: 'text-emerald-500', badge: 'success' as const };
    if (s >= 75) return { stroke: '#6366f1', bg: 'text-indigo-600', badge: 'blue' as const };
    if (s >= 60) return { stroke: '#f59e0b', bg: 'text-amber-500', badge: 'warning' as const };
    return { stroke: '#f43f5e', bg: 'text-rose-500', badge: 'destructive' as const };
  };

  const colorInfo = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90 transform">
          {/* Background circle */}
          <circle
            stroke="#e2e8f0"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Animated Progress circle */}
          <circle
            stroke={colorInfo.stroke}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`font-bold tracking-tight text-slate-900 ${textClass}`}>
            {score}
          </span>
          <span className={`font-medium uppercase tracking-wider text-slate-400 ${labelClass}`}>
            / 100
          </span>
        </div>
      </div>

      {showVerdict && verdict && (
        <div className="mt-3">
          <Badge variant={colorInfo.badge} className="px-3 py-1 text-xs font-semibold tracking-wide">
            {verdict}
          </Badge>
        </div>
      )}
    </div>
  );
};
