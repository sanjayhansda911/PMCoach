import { cn } from '../../lib/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose';
}

export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  color = 'indigo',
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={cn('h-full w-full flex-1 transition-all duration-500 ease-out', colors[color], indicatorClassName)}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
