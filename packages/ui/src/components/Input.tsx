import React from 'react';
import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-semibold tracking-wide uppercase text-slate-400">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              'w-full rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 placeholder-slate-500 py-3 transition-all duration-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm font-medium',
              {
                'pl-10': icon,
                'pl-4': !icon,
                'border-red-500 focus:border-red-500 focus:ring-red-500/10': error,
              },
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-medium text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
