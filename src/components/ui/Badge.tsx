import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'purple' | 'blue';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    outline: 'border border-slate-200 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/70',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200/70',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/70',
    blue: 'bg-indigo-50 text-indigo-700 border border-indigo-200/70',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
