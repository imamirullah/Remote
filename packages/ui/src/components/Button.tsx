import React from 'react';
import { cn } from '../utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          // Variants
          {
            'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 focus:ring-blue-500 ring-offset-slate-900':
              variant === 'primary',
            'bg-slate-800 text-slate-100 hover:bg-slate-700 focus:ring-slate-500 ring-offset-slate-900 border border-slate-700':
              variant === 'secondary',
            'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 focus:ring-slate-500':
              variant === 'outline',
            'bg-red-600/90 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 focus:ring-red-500 ring-offset-slate-900':
              variant === 'danger',
            'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50':
              variant === 'ghost',
            'backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/15 shadow-2xl focus:ring-indigo-500':
              variant === 'glass',
          },
          // Sizes
          {
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-6 py-3.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
