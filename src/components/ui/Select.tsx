import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options?: { value: string; label: string; description?: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, options, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              'flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 pr-10 cursor-pointer',
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )}
            ref={ref}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
